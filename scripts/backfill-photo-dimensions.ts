/**
 * Backfill Photo Dimensions and Thumbnails
 *
 * This script processes existing photos that are missing width/height dimensions
 * and generates thumbnails for them.
 *
 * Run with: npx tsx scripts/backfill-photo-dimensions.ts
 *
 * Options:
 *   --dry-run    Preview what would be done without making changes
 *   --limit=N    Process at most N photos (default: all)
 *   --batch=N    Process N photos per batch (default: 10)
 */

import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

// Configuration
const THUMBNAIL_WIDTH = 256;
const THUMBNAIL_QUALITY = 70; // 0-100 for sharp
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '10');
const LIMIT = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const DRY_RUN = process.argv.includes('--dry-run');

// Load environment variables
const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://eryhwfkqbbuftepjvgwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Get the service role key from: https://supabase.com/dashboard/project/eryhwfkqbbuftepjvgwq/settings/api');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface PhotoRow {
  id: string;
  asset_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
}

interface ProcessResult {
  photoId: string;
  success: boolean;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  error?: string;
}

async function getPhotosToProcess(): Promise<PhotoRow[]> {
  let query = supabase
    .from('photos')
    .select('id, asset_id, storage_path, thumbnail_path, width, height')
    .is('width', null)
    .order('created_at', { ascending: true });

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch photos: ${error.message}`);
  }

  return data || [];
}

async function downloadImage(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from('photos-compressed')
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processPhoto(photo: PhotoRow): Promise<ProcessResult> {
  try {
    // Download the original image
    const imageBuffer = await downloadImage(photo.storage_path);

    // Get image metadata (dimensions)
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        photoId: photo.id,
        success: false,
        error: 'Could not extract image dimensions',
      };
    }

    let thumbnailPath: string | null = photo.thumbnail_path;

    // Generate thumbnail if not already present
    if (!photo.thumbnail_path) {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();

      // Generate thumbnail path
      const filename = photo.storage_path.split('/').pop() || 'unknown.jpg';
      thumbnailPath = `photos/${photo.asset_id}/thumbnails/thumb_${filename}`;

      if (!DRY_RUN) {
        // Upload thumbnail
        const { error: uploadError } = await supabase.storage
          .from('photos-compressed')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '31536000', // 1 year
            upsert: true, // Overwrite if exists
          });

        if (uploadError) {
          console.warn(`  Warning: Failed to upload thumbnail: ${uploadError.message}`);
          thumbnailPath = null;
        }
      }
    }

    if (!DRY_RUN) {
      // Update database record
      const { error: updateError } = await supabase
        .from('photos')
        .update({
          width: metadata.width,
          height: metadata.height,
          ...(thumbnailPath && !photo.thumbnail_path ? { thumbnail_path: thumbnailPath } : {}),
        })
        .eq('id', photo.id);

      if (updateError) {
        return {
          photoId: photo.id,
          success: false,
          error: `Failed to update database: ${updateError.message}`,
        };
      }
    }

    return {
      photoId: photo.id,
      success: true,
      width: metadata.width,
      height: metadata.height,
      ...(thumbnailPath && { thumbnailPath }),
    };
  } catch (error) {
    return {
      photoId: photo.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('=== Photo Dimensions & Thumbnail Backfill ===\n');

  if (DRY_RUN) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Get photos to process
  console.log('Fetching photos without dimensions...');
  const photos = await getPhotosToProcess();

  if (photos.length === 0) {
    console.log('\nNo photos need processing. All photos have dimensions.');
    return;
  }

  console.log(`Found ${photos.length} photos to process\n`);

  // Process in batches
  let processed = 0;
  let successful = 0;
  let failed = 0;
  const errors: { photoId: string; error: string }[] = [];

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(photos.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} photos)...`);

    // Process batch concurrently
    const results = await Promise.all(batch.map(processPhoto));

    for (const result of results) {
      processed++;

      if (result.success) {
        successful++;
        console.log(`  ✓ ${result.photoId}: ${result.width}x${result.height}${result.thumbnailPath ? ' + thumbnail' : ''}`);
      } else {
        failed++;
        errors.push({ photoId: result.photoId, error: result.error || 'Unknown error' });
        console.log(`  ✗ ${result.photoId}: ${result.error}`);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < photos.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nFailed photos:');
    for (const err of errors) {
      console.log(`  - ${err.photoId}: ${err.error}`);
    }
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});

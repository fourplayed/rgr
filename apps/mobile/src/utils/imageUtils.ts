import * as ImageManipulator from 'expo-image-manipulator';

export const THUMBNAIL_WIDTH = 256;
export const THUMBNAIL_QUALITY = 0.7;

export interface ThumbnailResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Generate a thumbnail from an image.
 * Resizes to THUMBNAIL_WIDTH (256px) maintaining aspect ratio.
 */
export async function generateThumbnail(
  imageUri: string
): Promise<ThumbnailResult> {
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: THUMBNAIL_WIDTH } }],
    { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

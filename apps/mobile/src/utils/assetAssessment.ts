import type {
  AssetWithRelations,
  MaintenanceRecordWithNames,
  PhotoListItem,
  ScanEventWithScanner,
  Depot,
  DefectReportListItem,
} from '@rgr/shared';
import { formatDate, findDepotByLocationString } from '@rgr/shared';

const DAY_MS = 86_400_000;

export interface AssetAssessmentInput {
  asset: AssetWithRelations;
  maintenance: MaintenanceRecordWithNames[];
  photos: PhotoListItem[];
  scans: ScanEventWithScanner[];
  depots: Depot[];
  defectReports?: DefectReportListItem[];
  now?: Date;
}

/** Relative time description using an injectable `now` for testability. */
function relativeTime(dateStr: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(dateStr).getTime()) / DAY_MS);
  if (days === 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'about a week ago';
  return `${days} days ago`;
}

interface LocationHistory {
  durationDays: number;
  previousName: string | null;
  previousDate: string | null;
  previousScanId: string | null;
  previousScanType: string | null;
}

/**
 * Walk scans newest→oldest to find when the asset arrived at its current depot
 * and where it was before that.
 */
function analyzeLocationHistory(
  scans: ScanEventWithScanner[],
  depots: Depot[],
  currentDepotName: string,
  now: Date
): LocationHistory | null {
  if (scans.length === 0) return null;

  const sorted = [...scans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const currentLower = currentDepotName.toLowerCase();

  for (let i = 0; i < sorted.length; i++) {
    const scan = sorted[i]!;
    if (!scan.locationDescription) continue;

    const matched = findDepotByLocationString(scan.locationDescription, depots);
    const matchedName = matched?.name ?? null;

    // Found a scan at a different location
    if (!matchedName || matchedName.toLowerCase() !== currentLower) {
      // The scan just before this one (closer to present) is when it arrived
      const arrival = i > 0 ? sorted[i - 1]! : sorted[0]!;
      return {
        durationDays: Math.floor((now.getTime() - new Date(arrival.createdAt).getTime()) / DAY_MS),
        previousName: matchedName || scan.locationDescription,
        previousDate: scan.createdAt,
        previousScanId: scan.id,
        previousScanType: scan.scanType,
      };
    }
  }

  // All available scans are at the current depot — it's been here at least since the oldest
  const oldest = sorted[sorted.length - 1]!;
  return {
    durationDays: Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / DAY_MS),
    previousName: null,
    previousDate: null,
    previousScanId: null,
    previousScanType: null,
  };
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Determine the workflow context of a scan by cross-referencing with
 * maintenance records (via scanEventId) and photos (via temporal proximity).
 */
function describeScanContext(
  scanId: string,
  scanType: string,
  scanDate: string,
  maintenance: MaintenanceRecordWithNames[],
  photos: PhotoListItem[]
): string {
  const linkedMaint = maintenance.find((m) => m.scanEventId === scanId);
  const scanMs = new Date(scanDate).getTime();
  const linkedPhoto = photos.some(
    (p) => Math.abs(new Date(p.createdAt).getTime() - scanMs) < FIVE_MINUTES_MS
  );

  const isDefect = linkedMaint?.title.toLowerCase().includes('defect');

  if (linkedMaint && linkedPhoto) return 'as part of a combination';
  if (isDefect) return 'during a defect report';
  if (linkedMaint) return 'during a maintenance task';
  if (linkedPhoto) return 'during a photo upload';

  switch (scanType) {
    case 'qr_scan':
      return 'via a QR scan';
    case 'nfc_scan':
      return 'via an NFC scan';
    case 'manual_entry':
      return 'via manual entry';
    case 'gps_auto':
      return 'via GPS auto-detection';
    default:
      return 'via a scan';
  }
}

/**
 * Build a 1-3 sentence natural-language assessment of an asset's current state.
 * Pure function — no hooks, no network calls. Uses data already fetched on the
 * detail screen (asset, maintenance, photos).
 */
export function buildAssetAssessment({
  asset,
  maintenance,
  photos,
  scans,
  depots,
  defectReports = [],
  now = new Date(),
}: AssetAssessmentInput): string {
  const type = asset.subtype?.toLowerCase() || (asset.category === 'dolly' ? 'dolly' : 'trailer');
  const nowMs = now.getTime();

  // ── Aggregate hazard data across all photos ──
  let totalHazards = 0;
  let hasHighSeverity = false;
  let isBlocked = false;

  for (const photo of photos) {
    totalHazards += photo.hazardCount;
    if (photo.maxSeverity === 'critical' || photo.maxSeverity === 'high') hasHighSeverity = true;
    if (photo.blockedFromDeparture) isBlocked = true;
  }

  // ── Categorize defects and maintenance ──
  const openDefects = defectReports.filter(
    (d) => d.status === 'reported' || d.status === 'accepted'
  );

  const overdue = maintenance.filter(
    (m) => m.status === 'scheduled' && m.dueDate && new Date(m.dueDate).getTime() < nowMs
  );

  const nextScheduled = maintenance
    .filter((m) => m.status === 'scheduled' && m.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

  const recentlyCompleted = maintenance
    .filter((m) => m.status === 'completed' && m.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

  const isRecentCompletion =
    recentlyCompleted && nowMs - new Date(recentlyCompleted.completedAt!).getTime() <= 14 * DAY_MS;

  // ── Sentence B — most important issue (pick first match) ──
  let sentenceB = '';
  let isIssue = false; // true for problem-level priorities (1-5)

  if (isBlocked) {
    sentenceB = "it's been flagged and blocked from departure.";
    isIssue = true;
  } else if (totalHazards > 0 && hasHighSeverity) {
    sentenceB = `there ${totalHazards === 1 ? 'is' : 'are'} ${totalHazards} hazard${totalHazards !== 1 ? 's' : ''} flagged, including high-severity issues that need review.`;
    isIssue = true;
  } else if (totalHazards > 0) {
    sentenceB = `${totalHazards} minor hazard${totalHazards !== 1 ? 's were' : ' was'} picked up in recent photos.`;
    isIssue = true;
  } else if (openDefects.length > 0) {
    sentenceB =
      openDefects.length === 1
        ? "there's an open defect report that needs attention."
        : `there are ${openDefects.length} open defect reports that need attention.`;
    isIssue = true;
  } else if (overdue.length > 0) {
    sentenceB = `there ${overdue.length === 1 ? 'is' : 'are'} ${overdue.length} overdue maintenance task${overdue.length !== 1 ? 's' : ''} that need${overdue.length === 1 ? 's' : ''} attention.`;
    isIssue = true;
  } else if (nextScheduled) {
    sentenceB = `Next service is coming up on ${formatDate(nextScheduled.scheduledDate!)}.`;
  } else if (isRecentCompletion) {
    sentenceB = `Last service was wrapped up ${relativeTime(recentlyCompleted!.completedAt!, now)}.`;
  } else if (recentlyCompleted) {
    // Older completed maintenance — include the task title for context
    const title =
      recentlyCompleted.title.length > 40
        ? recentlyCompleted.title.slice(0, 37) + '...'
        : recentlyCompleted.title;
    sentenceB = `Last service was ${title.charAt(0).toLowerCase()}${title.slice(1)}, completed on ${formatDate(recentlyCompleted.completedAt!)}.`;
  } else if (asset.lastLocationUpdatedAt) {
    // No maintenance history — fall back to scan activity with context
    const byWhom = asset.lastScannerName ? ` by ${asset.lastScannerName}` : '';
    const atWhere = asset.depotName ? ` at ${asset.depotName}` : '';
    sentenceB = `It was last scanned${byWhom}${atWhere}, ${relativeTime(asset.lastLocationUpdatedAt, now)}.`;
  }

  // ── Sentence A — status opener ──
  // When there's an issue AND the status isn't out_of_service, A flows into B
  // with a transition word ("but" / "—"). Otherwise A ends with a period.
  const flowsIntoB = isIssue && asset.status !== 'out_of_service';

  let sentenceA: string;
  switch (asset.status as string) {
    case 'serviced':
      sentenceA = flowsIntoB
        ? `This ${type}'s in service, but`
        : `This ${type}'s in service with no issues.`;
      break;
    case 'maintenance':
      sentenceA = flowsIntoB
        ? `This ${type}'s in for maintenance —`
        : `This ${type}'s currently in for maintenance.`;
      break;
    case 'out_of_service':
      sentenceA = isIssue ? `This ${type}'s out of service.` : `This ${type} is out of service.`;
      break;
    default:
      sentenceA = `This ${type} has status "${asset.status}".`;
      break;
  }

  // ── Assemble sentences ──
  const sentences: string[] = [];

  if (sentenceB && flowsIntoB) {
    // A transitions into B (B stays lowercase)
    sentences.push(`${sentenceA} ${sentenceB}`);
  } else if (sentenceB) {
    // A and B are separate — capitalize B
    const capB = sentenceB.charAt(0).toUpperCase() + sentenceB.slice(1);
    sentences.push(sentenceA);
    sentences.push(capB);
  } else {
    sentences.push(sentenceA);
  }

  // ── Sentence C — secondary observation (if under 3 sentences) ──

  // C1: Registration warnings (actionable — highest priority)
  if (sentences.length < 3 && asset.registrationExpiry) {
    const daysUntilExpiry = (new Date(asset.registrationExpiry).getTime() - nowMs) / DAY_MS;
    if (daysUntilExpiry < 0) {
      sentences.push(`Registration's been expired since ${formatDate(asset.registrationExpiry)}.`);
    } else if (daysUntilExpiry <= 30) {
      sentences.push(
        `Heads up — registration's due for renewal on ${formatDate(asset.registrationExpiry)}.`
      );
    }
  }

  // C2: Location history — where it was before, how it got there
  if (sentences.length < 3 && asset.depotName) {
    const location = analyzeLocationHistory(scans, depots, asset.depotName, now);
    if (
      location?.previousName &&
      location.previousDate &&
      location.previousScanId &&
      location.previousScanType
    ) {
      const context = describeScanContext(
        location.previousScanId,
        location.previousScanType,
        location.previousDate,
        maintenance,
        photos
      );
      sentences.push(
        `It was previously scanned at ${location.previousName} ${context}, ${relativeTime(location.previousDate, now)}.`
      );
    }
  }

  // C3: Stale scan warning (only if location history didn't already cover it)
  if (sentences.length < 3 && asset.lastLocationUpdatedAt) {
    const daysSinceScan = Math.floor(
      (nowMs - new Date(asset.lastLocationUpdatedAt).getTime()) / DAY_MS
    );
    if (daysSinceScan >= 30) {
      sentences.push(`It hasn't been scanned in over ${daysSinceScan} days.`);
    }
  }

  return sentences.join(' ');
}

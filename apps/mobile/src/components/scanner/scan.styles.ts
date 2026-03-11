import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  fontFamily as fonts,
} from '../../theme/spacing';
import { HEADER_STATUS_BAR_GAP, HEADER_HEIGHT } from '../../theme/layout';

export const SCAN_FRAME_SIZE = 250;
export const TOP_BAR_HEIGHT = HEADER_STATUS_BAR_GAP + HEADER_HEIGHT + spacing.xl + 56;
const CORNER_SIZE = 40;
const CORNER_THICKNESS = 4;

export const styles = StyleSheet.create({
  // ── Shared layout ──────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  containerInner: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.scanOverlay,
  },

  // ── Top bar (replaces header) ──────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: HEADER_STATUS_BAR_GAP + HEADER_HEIGHT + spacing.xl,
    paddingBottom: spacing.sm,
    minHeight: TOP_BAR_HEIGHT,
  },
  topBarTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topBarSubtitleText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  // ── Scan frame ─────────────────────────────────────────
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '15%',
  },
  scanReticle: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.scanCorner,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },

  // ── Scan status pill (below reticle) ───────────────────
  scanStatusPill: {
    marginTop: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  scanStatusText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },

  // ── Footer tray (replaces footer) ─────────────────────
  footerTray: {
    backgroundColor: colors.overlayCard,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  debugButtonContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },

  // ── Scanner button system ──────────────────────────────
  scannerButtonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  scannerButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },

  // Button variants
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    color: colors.textInverse,
  },
  buttonDefault: {
    backgroundColor: colors.overlayLight,
  },
  buttonDefaultText: {
    color: colors.electricBlue,
  },
  buttonError: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error + '50',
  },
  buttonErrorText: {
    color: colors.error,
  },
  buttonSuccess: {
    backgroundColor: colors.success,
  },
  buttonSuccessText: {
    color: colors.textInverse,
  },
  // ── Kept for non-overlay screens ───────────────────────
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: fonts.bold,
    color: colors.chrome,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: fonts.bold,
    color: colors.scanSuccess,
  },
  statusValueError: {
    color: colors.error,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  messageText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },

  // ── Confirmation bottom sheet (overlays blurred camera) ─
  confirmSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    zIndex: 1000,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
});

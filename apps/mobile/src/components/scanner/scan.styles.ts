import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

export const SCAN_FRAME_SIZE = 250;
export const TOP_BAR_HEIGHT = 56;
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
    paddingVertical: spacing.sm,
    minHeight: TOP_BAR_HEIGHT,
  },
  topBarBadges: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topBarDepotName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flexShrink: 1,
  },
  topBarTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topBarSubtitleText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  topBarCount: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.full,
  },
  topBarCountText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  tappableCount: {
    textDecorationLine: 'underline',
  },

  // ── Floating toast container ───────────────────────────
  floatingToastContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },

  // ── Scan frame ─────────────────────────────────────────
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.scanCorner,
  },
  cornerTopLeft: {
    top: -SCAN_FRAME_SIZE / 2,
    left: -SCAN_FRAME_SIZE / 2,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTopRight: {
    top: -SCAN_FRAME_SIZE / 2,
    right: -SCAN_FRAME_SIZE / 2,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBottomLeft: {
    bottom: -SCAN_FRAME_SIZE / 2,
    left: -SCAN_FRAME_SIZE / 2,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBottomRight: {
    bottom: -SCAN_FRAME_SIZE / 2,
    right: -SCAN_FRAME_SIZE / 2,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },

  // ── Scan status pill (absolute inside scanFrame) ───────
  scanStatusPill: {
    position: 'absolute',
    top: SCAN_FRAME_SIZE / 2 + spacing.md,
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
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_700Bold',
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
  buttonChain: {
    backgroundColor: colors.violet + '20',
    borderWidth: 1,
    borderColor: colors.violet + '50',
  },
  buttonChainText: {
    color: colors.violet,
  },

  // ── Chain action row ───────────────────────────────────
  chainActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
    fontFamily: 'Lato_700Bold',
    color: colors.chrome,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_400Regular',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});

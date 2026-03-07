import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing, fontSize, borderRadius, fontFamily } from './spacing';

/**
 * Shared form styles for sheet modals (CreateMaintenanceModal, EditProfileModal,
 * DepotFormSheet, and any future form sheets).
 *
 * Layout contract
 * ---------------
 * - `inputGroup`  — vertical rhythm wrapper; default marginBottom is spacing.md (12).
 *                   Override locally when a form needs looser rhythm (e.g. spacing.base).
 * - `label`       — ALL-CAPS bold label above every field; always identical.
 * - `input`       — single-line text input with paddingVertical. Use when the field
 *                   should grow with content (default for most modals).
 * - `inputFixed`  — single-line text input with a fixed height: 48. Use when pixel-
 *                   perfect row height is required (e.g. admin forms next to a Switch).
 * - `textArea`    — extends `input`; apply alongside `input` for multiline fields.
 * - `errorText`   — inline validation error below the last field.
 * - `buttonRow`   — horizontal Cancel / Confirm button pair inside scroll content.
 */
export const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: spacing.md,
  },

  label: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },

  /**
   * Standard input — uses paddingVertical so height adjusts to font / platform.
   * CreateMaintenanceModal and EditProfileModal use this variant.
   */
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },

  /**
   * Fixed-height input — 48 px tall, no paddingVertical.
   * Use when the field sits beside a Switch or other fixed-height control
   * (e.g. DepotFormSheet) to keep rows visually aligned.
   */
  inputFixed: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },

  /**
   * Multiline extension — compose with `input`:
   *   style={[formStyles.input, formStyles.textArea]}
   */
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginBottom: spacing.md,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

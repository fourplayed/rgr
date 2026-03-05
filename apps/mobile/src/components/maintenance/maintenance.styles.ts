import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize } from '../../theme/spacing';
import { cardStyles as sharedCardStyles } from '../../theme/cardStyles';

/**
 * Card styles for maintenance and defect report list items.
 *
 * Container and containerInline come from the shared theme cardStyles.
 * Layout styles (cardRow, cardBody, etc.) are maintenance-specific.
 */
export const cardStyles = {
  ...sharedCardStyles,
  ...StyleSheet.create({
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIconContainer: {
      width: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    cardBody: {
      flex: 1,
    },
    cardContentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    cardTitle: {
      fontSize: fontSize.sm,
      fontFamily: 'Lato_700Bold',
      color: colors.text,
      flex: 1,
    },
    cardBadges: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardSecondaryText: {
      fontSize: fontSize.xs,
      fontFamily: 'Lato_400Regular',
      color: colors.textSecondary,
      flex: 1,
      marginRight: spacing.sm,
    },
    cardTime: {
      fontSize: fontSize.xs,
      fontFamily: 'Lato_400Regular',
      color: colors.textSecondary,
    },
  }),
};

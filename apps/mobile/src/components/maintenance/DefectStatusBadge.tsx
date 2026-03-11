import React, { memo } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { DefectStatus } from '@rgr/shared';
import { DefectStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { Badge } from '../common/StatusBadge';

export const DEFECT_STATUS_CONFIG: Record<
  DefectStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  reported: { icon: 'warning', color: colors.defectYellow },
  task_created: { icon: 'construct', color: colors.info },
  resolved: { icon: 'checkmark-circle', color: colors.success },
  dismissed: { icon: 'close-circle', color: colors.textSecondary },
};

interface DefectStatusBadgeProps {
  status: DefectStatus;
  /** Override the default label from DefectStatusLabels */
  label?: string;
  /** Override the default status color */
  color?: string;
}

export const DefectStatusBadge = memo(function DefectStatusBadge({
  status,
  label,
  color,
}: DefectStatusBadgeProps) {
  return (
    <Badge
      label={label ?? DefectStatusLabels[status] ?? status}
      color={color ?? DEFECT_STATUS_CONFIG[status]?.color ?? colors.textSecondary}
    />
  );
});

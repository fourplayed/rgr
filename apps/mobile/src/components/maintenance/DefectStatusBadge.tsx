import React, { memo } from 'react';
import type { DefectStatus } from '@rgr/shared';
import { DefectStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { Badge } from '../common/StatusBadge';

const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  reported: colors.warning,
  accepted: colors.info,
  resolved: colors.success,
  dismissed: colors.textSecondary,
};

interface DefectStatusBadgeProps {
  status: DefectStatus;
}

export const DefectStatusBadge = memo(function DefectStatusBadge({ status }: DefectStatusBadgeProps) {
  return (
    <Badge
      label={DefectStatusLabels[status] || status}
      color={DEFECT_STATUS_COLORS[status] ?? colors.textSecondary}
    />
  );
});

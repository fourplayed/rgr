import React, { memo } from 'react';
import type { DefectStatus } from '@rgr/shared';
import { DefectStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { Badge } from '../common/StatusBadge';
import { DEFECT_STATUS_CONFIG } from './DefectReportListItem';

interface DefectStatusBadgeProps {
  status: DefectStatus;
  /** Override the default label from DefectStatusLabels */
  label?: string;
}

export const DefectStatusBadge = memo(function DefectStatusBadge({ status, label }: DefectStatusBadgeProps) {
  return (
    <Badge
      label={label ?? DefectStatusLabels[status] ?? status}
      color={DEFECT_STATUS_CONFIG[status]?.color ?? colors.textSecondary}
    />
  );
});

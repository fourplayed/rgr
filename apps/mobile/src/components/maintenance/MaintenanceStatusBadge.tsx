import React, { memo } from 'react';
import type { MaintenanceStatus } from '@rgr/shared';
import { MaintenanceStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { Badge } from '../common/StatusBadge';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

export const MaintenanceStatusBadge = memo(function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  return (
    <Badge
      label={MaintenanceStatusLabels[status] || status}
      color={colors.maintenanceStatus[status] ?? colors.textSecondary}
    />
  );
});

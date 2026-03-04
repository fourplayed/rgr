import React, { memo } from 'react';
import type { MaintenancePriority } from '@rgr/shared';
import { MaintenancePriorityLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { Badge } from '../common/StatusBadge';

interface MaintenancePriorityBadgeProps {
  priority: MaintenancePriority;
}

export const MaintenancePriorityBadge = memo(function MaintenancePriorityBadge({ priority }: MaintenancePriorityBadgeProps) {
  const color = (priority in colors.maintenancePriority
    ? colors.maintenancePriority[priority as keyof typeof colors.maintenancePriority]
    : undefined) ?? colors.textSecondary;

  return (
    <Badge
      label={MaintenancePriorityLabels[priority] || priority}
      color={color}
    />
  );
});

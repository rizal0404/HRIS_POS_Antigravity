
import React from 'react';
import { RequestStatus } from '../../types';

interface BadgeProps {
  status: RequestStatus;
}

const statusStyles: Record<RequestStatus, { text: string; classes: string }> = {
  [RequestStatus.PENDING]: {
    text: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full',
  },
  [RequestStatus.APPROVED]: {
    text: 'Approved',
    classes: 'text-green-600',
  },
  [RequestStatus.REJECTED]: {
    text: 'Rejected',
    classes: 'text-red-600',
  },
  [RequestStatus.REVISED]: {
    text: 'Revised',
    classes: 'text-blue-600',
  },
};

const Badge: React.FC<BadgeProps> = ({ status }) => {
  const { text, classes } = statusStyles[status] || { text: 'Unknown', classes: 'text-gray-500' };

  return (
    <span className={`inline-flex items-center text-xs font-medium ${classes}`}>
      {text}
    </span>
  );
};

export default Badge;
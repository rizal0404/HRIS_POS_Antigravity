

import React, { useMemo } from 'react';
import { Attendance, Request, UserProfile, RequestType } from '../../types';
import { formatDate, formatTime } from '../../lib/utils';
import { ClockIcon, DocumentAddIcon } from '../icons';
import Badge from './Badge';

type HistoryEvent = (Request & { type: 'request' }) | (Attendance & { type: 'attendance' });

interface HistoryItemProps {
  item: HistoryEvent;
  onKoreksiClick: (attendance: Attendance) => void;
  onDetailClick: (item: HistoryEvent) => void;
  allUsers: UserProfile[];
}

const getIcon = (item: HistoryEvent) => {
    if (item.type === 'attendance') {
        return <ClockIcon className="h-6 w-6 text-blue-600" />;
    }
    return <DocumentAddIcon className="h-6 w-6 text-purple-600" />;
};

const getTitle = (item: HistoryEvent): string => {
    if (item.type === 'attendance') {
        const statusText = item.status.replace('_', ' ');
        return `Absensi - ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`;
    }
    return `Pengajuan ${item.request_type}`;
};

const renderDetails = (item: HistoryEvent, usersMap: Map<string, string>) => {
    if (item.type === 'attendance') {
        return (
            <>
                <p className="text-sm text-gray-600">
                    <span className="font-semibold">Clock In:</span> {formatTime(new Date(item.clock_in))}
                </p>
                {item.clock_out && (
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">Clock Out:</span> {formatTime(new Date(item.clock_out))}
                    </p>
                )}
            </>
        );
    }
    
    // It's a request
    if (item.request_type === RequestType.SUBSTITUSI) {
        try {
            const parsed = JSON.parse(item.reason);
            const renderShiftLabel = (shift?: { code?: string; name?: string }) => {
                if (!shift) return '-';
                if (shift.name && shift.code) return `${shift.name} (${shift.code})`;
                return shift.name || shift.code || '-';
            };

            return (
                <div>
                    <p className="text-sm text-gray-600 italic">"{parsed.keterangan || item.reason}"</p>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                        <p>Shift Awal: <span className="font-semibold text-gray-800">{renderShiftLabel(parsed.shift_awal)}</span></p>
                        <p>Shift Baru: <span className="font-semibold text-gray-800">{renderShiftLabel(parsed.shift_baru)}</span></p>
                    </div>
                </div>
            );
        } catch (e) {
            return <p className="text-sm text-gray-600 italic">"{item.reason}"</p>;
        }
    }

    if (item.request_type === RequestType.CUTI && item.reason.startsWith('{')) {
         try {
            const parsed = JSON.parse(item.reason);
            const mainReason = parsed.reason || item.reason;
            const substitutes = parsed.substitutes;

            return (
                <div>
                    <p className="text-sm text-gray-600 italic">"{mainReason}"</p>
                    {substitutes && Object.keys(substitutes).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="font-semibold text-xs text-gray-500 uppercase">Pengganti Shift</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                {Object.entries(substitutes).map(([date, shifts]: [string, any]) => {
                                    const daySubstitute = shifts.day ? usersMap.get(shifts.day) || 'N/A' : null;
                                    const nightSubstitute = shifts.night ? usersMap.get(shifts.night) || 'N/A' : null;
                                    if (!daySubstitute && !nightSubstitute) return null;

                                    return (
                                        <li key={date} className="flex gap-x-2">
                                            <span className="font-medium text-gray-800">{new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}:</span>
                                            <div className="flex-1">
                                                {daySubstitute && <p>Pagi: <span className="font-semibold">{daySubstitute}</span></p>}
                                                {nightSubstitute && <p>Malam: <span className="font-semibold">{nightSubstitute}</span></p>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            return <p className="text-sm text-gray-600 italic">"{item.reason}"</p>;
        }
    }

    return (
        <p className="text-sm text-gray-600 italic">"{item.reason}"</p>
    );
};

const HistoryItem: React.FC<HistoryItemProps> = ({ item, onKoreksiClick, onDetailClick, allUsers }) => {
  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.full_name])), [allUsers]);
  const Icon = getIcon(item);
  const title = getTitle(item);
  const eventDate = 'clock_in' in item ? item.clock_in : item.created_at;
  const isAttendance = item.type === 'attendance';

  const handleDetailClick = (e: React.MouseEvent) => {
      // Prevent triggering detail view when clicking the correction button itself
      if ((e.target as HTMLElement).closest('button')) {
          return;
      }
      onDetailClick(item);
  };

  return (
    <div 
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={handleDetailClick}
    >
      <div className="p-4 flex items-start space-x-4">
        <div className={`flex-shrink-0 p-3 rounded-full ${isAttendance ? 'bg-blue-100' : 'bg-purple-100'}`}>
          {Icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-800">{title}</p>
              {item.type === 'request' && <Badge status={item.status} />}
          </div>
          <div className="mt-1">
              {renderDetails(item, usersMap)}
          </div>
          <p className="text-xs text-gray-400 mt-2">
              {formatDate(new Date(eventDate))}
          </p>
        </div>
      </div>
      {isAttendance && (
        <div className="px-4 pb-3 pt-2 border-t flex justify-end">
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent the main div's onClick from firing
                    onKoreksiClick(item as Attendance)
                }}
                className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md hover:bg-yellow-600 transition-colors"
            >
                Ajukan Koreksi
            </button>
        </div>
      )}
    </div>
  );
};

export default HistoryItem;

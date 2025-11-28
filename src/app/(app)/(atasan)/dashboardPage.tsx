"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, Request, RequestType, RequestStatus, Attendance } from '../../../types';
import { apiService } from '../../../services/apiService';
import { ClockIcon, DocumentAddIcon, CheckCircleIcon } from '../../../components/icons';
import { getAllSubordinates, timeAgo } from '../../../lib/utils';
import Spinner from '../../../components/ui/Spinner';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate: (path: string) => void;
}

const StatCard: React.FC<{ title: string; count: number; icon: React.ReactNode; color: string; onClick: () => void; }> = ({ title, count, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left bg-white rounded-lg shadow-md p-5 flex items-center space-x-4 transition-transform hover:scale-105"
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{count}</p>
        </div>
    </button>
);

interface Activity {
    type: RequestType | 'Presensi';
    user: UserProfile;
    timestamp: string;
    details: string;
    key: string;
}

const AtasanDashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
    const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const users = await apiService.getProfiles();
            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map(s => s.id);

            if (subIds.length > 0) {
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
                const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
                
                const [allSubordinateRequests, attendanceToday] = await Promise.all([
                    apiService.getSubordinateRequests(subIds),
                    apiService.getAttendanceForSubordinates(subIds, startOfDay, endOfDay)
                ]);

                setPendingRequests(allSubordinateRequests.filter(r => r.status === RequestStatus.PENDING));

                const todayStr = today.toISOString().split('T')[0];
                const usersMap = new Map(users.map(u => [u.id, u]));

                const attendanceActivities: Activity[] = attendanceToday.map(att => ({
                    type: 'Presensi',
                    user: usersMap.get(att.profile_id)!,
                    timestamp: att.clock_in,
                    details: `melakukan clock-in pada jam ${new Date(att.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
                    key: `att-${att.id}`
                }));

                const requestActivities: Activity[] = allSubordinateRequests
                    .filter(req => new Date(req.created_at).toISOString().split('T')[0] === todayStr)
                    .map(req => ({
                        type: req.request_type,
                        user: usersMap.get(req.profile_id)!,
                        timestamp: req.created_at,
                        details: `mengajukan ${req.request_type}`,
                        key: `req-${req.id}`
                    }));

                const combinedActivities = [...attendanceActivities, ...requestActivities]
                    .filter(act => act.user)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setRecentActivities(combinedActivities.slice(0, 7));
            } else {
                setPendingRequests([]);
                setRecentActivities([]);
            }
        } catch(e) {
            console.error("Failed to load dashboard data:", e);
        } finally {
            setLoading(false);
        }
    }, [user.id]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => ({
        cuti: pendingRequests.filter(r => r.request_type === RequestType.CUTI).length,
        lembur: pendingRequests.filter(r => r.request_type === RequestType.LEMBUR).length,
        sakit: pendingRequests.filter(r => r.request_type === RequestType.SAKIT).length,
        izin: pendingRequests.filter(r => r.request_type === RequestType.IZIN).length,
        koreksi: pendingRequests.filter(r => r.request_type === RequestType.KOREKSI).length,
    }), [pendingRequests]);

    const activityIconMap: Record<Activity['type'], React.ReactNode> = {
        'Presensi': <ClockIcon className="h-6 w-6 text-blue-600" />,
        [RequestType.CUTI]: <DocumentAddIcon className="h-6 w-6 text-purple-600" />,
        [RequestType.LEMBUR]: <ClockIcon className="h-6 w-6 text-orange-600" />,
        [RequestType.SAKIT]: <DocumentAddIcon className="h-6 w-6 text-red-600" />,
        [RequestType.IZIN]: <DocumentAddIcon className="h-6 w-6 text-yellow-600" />,
        [RequestType.KOREKSI]: <CheckCircleIcon className="h-6 w-6 text-green-600" />,
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-full">
                <Spinner /> <span className="ml-2">Memuat dashboard...</span>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Tim</h2>
                <p className="text-gray-600">Selamat datang, {user.full_name}. Berikut ringkasan tim Anda.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                <StatCard title="Ajuan Cuti" count={summary.cuti} icon={<DocumentAddIcon className="h-6 w-6 text-purple-600" />} color="bg-purple-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Lembur" count={summary.lembur} icon={<ClockIcon className="h-6 w-6 text-orange-600" />} color="bg-orange-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Sakit" count={summary.sakit} icon={<DocumentAddIcon className="h-6 w-6 text-red-600" />} color="bg-red-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Izin" count={summary.izin} icon={<DocumentAddIcon className="h-6 w-6 text-yellow-600" />} color="bg-yellow-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Koreksi" count={summary.koreksi} icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />} color="bg-green-100" onClick={() => onNavigate('/persetujuan')} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Aktivitas Terbaru Tim</h3>
                {recentActivities.length > 0 ? (
                    <div className="space-y-4">
                        {recentActivities.map(activity => (
                             <div key={activity.key} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                                <div className="flex-shrink-0">
                                    {activityIconMap[activity.type]}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-800">
                                        <span className="font-semibold">{activity.user.full_name}</span> {activity.details}
                                    </p>
                                    <p className="text-xs text-gray-500">{timeAgo(new Date(activity.timestamp))}</p>
                                </div>
                                <img src={activity.user.avatar_url} alt={activity.user.full_name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">Belum ada aktivitas terbaru untuk ditampilkan.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AtasanDashboardPage;

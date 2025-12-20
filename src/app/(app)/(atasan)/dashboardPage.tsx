"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, Request, RequestType, RequestStatus, Attendance } from '../../../types';
import { apiService } from '../../../services/apiService';
import {
    ClockIcon,
    DocumentAddIcon,
    CheckCircleIcon,
    CalendarIcon,
    BriefcaseIcon,
    RefreshIcon,
    XIcon
} from '../../../components/icons';
import { getAllSubordinates, formatDateKey, formatTime } from '../../../lib/utils';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { KPI_DEFAULT_CONFIG, computeKpiScore } from '@/components/kpi/KpiCalculator';

interface DashboardPageProps {
    user: UserProfile;
    onNavigate: (path: string) => void;
}

const AtasanDashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
    const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<{ profile: UserProfile; attendance?: Attendance; leaveType?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        try {
            const users = await apiService.getProfiles();
            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map((s) => s.id);

            if (subIds.length > 0) {
                const today = new Date();
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                const startDateStr = formatDateKey(startMonth);
                const endDateStr = formatDateKey(endMonth);
                const todayStr = formatDateKey(today);

                const [allSubordinateRequests, attendanceMonth, leaves] = await Promise.all([
                    apiService.getSubordinateRequests(subIds),
                    apiService.getAttendanceForSubordinates(subIds, startMonth.toISOString(), endMonth.toISOString()),
                    apiService.getOtherApprovedRequestsForPeriod(subIds, startDateStr, endDateStr),
                ]);

                setPendingRequests(allSubordinateRequests.filter((r) => r.status === RequestStatus.PENDING));

                // Process "Who's Out Today"
                const outToday = subordinates.map(sub => {
                    const dailyAtt = attendanceMonth.find(a => a.profile_id === sub.id && formatDateKey(new Date(a.clock_in)) === todayStr);
                    const onLeave = leaves.find(l => {
                        const start = new Date(l.start_date);
                        const end = new Date(l.end_date);
                        return l.profile_id === sub.id && today >= start && today <= end;
                    });

                    return {
                        profile: sub,
                        attendance: dailyAtt,
                        leaveType: onLeave ? onLeave.request_type : undefined
                    };
                }).filter(item => !item.attendance && item.leaveType); // Only show those who are explicitly OUT (on leave)
                // Note: The reference visual implies "Who's Out Today" shows leave/absent. 
                // We'll calculate "Out" as: Has approved leave for today OR (Visual decision) maybe just Leave? 
                // Let's stick to Approved Leave for "Out". Absent without leave is just "Missing".

                setTodayAttendance(outToday);

            } else {
                setPendingRequests([]);
                setTodayAttendance([]);
            }
        } catch (e) {
            console.error("Failed to load dashboard data:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const stats = useMemo(() => {
        const leaveReqs = pendingRequests.filter(r => [RequestType.CUTI, RequestType.SAKIT, RequestType.IZIN].includes(r.request_type)).length;
        const overtimeReqs = pendingRequests.filter(r => r.request_type === RequestType.LEMBUR).length;
        const shiftSwapReqs = pendingRequests.filter(r => r.request_type === RequestType.KOREKSI).length; // Mapping Koreksi to Shift Swaps/Changes

        return { leaveReqs, overtimeReqs, shiftSwapReqs };
    }, [pendingRequests]);

    const handleApprove = async (req: Request) => {
        setProcessingId(req.id);
        try {
            await apiService.updateRequestStatus(req.id, RequestStatus.APPROVED, user.id); // Assuming approveRequest logic exists or using updateStatus
            await fetchData();
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("Gagal menyetujui permintaan.");
        } finally {
            setProcessingId(null);
        }
    };

    const getRequestBadge = (type: RequestType) => {
        switch (type) {
            case RequestType.CUTI: return <Badge variant="warning" className="bg-orange-50 text-orange-600 border-orange-200"><BriefcaseIcon className="w-3 h-3 mr-1" /> Cuti</Badge>;
            // Using Sick Leave icon/color from reference (ish)
            case RequestType.SAKIT: return <Badge variant="danger" className="bg-red-50 text-red-600 border-red-200"><span className="material-symbols-outlined text-[12px] mr-1">coronavirus</span> Sakit</Badge>;
            case RequestType.LEMBUR: return <Badge variant="info" className="bg-blue-50 text-blue-600 border-blue-200"><ClockIcon className="w-3 h-3 mr-1" /> Lembur</Badge>;
            case RequestType.KOREKSI: return <Badge variant="primary" className="bg-purple-50 text-purple-600 border-purple-200"><RefreshIcon className="w-3 h-3 mr-1" /> Koreksi</Badge>;
            default: return <Badge variant="secondary">{type}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Spinner /> <span className="ml-2 text-text-secondary font-medium">Loading Dashboard...</span>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Good Morning, {user.full_name.split(' ')[0]}</h1>
                    <p className="text-slate-500 mt-1">Here's what's happening with your team today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={refreshing}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                    >
                        {refreshing ? <Spinner className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                    </button>
                    <button className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors relative">
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        {pendingRequests.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                        {user.avatar_url ? <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{user.full_name.charAt(0)}</div>}
                    </div>
                </div>
            </div>

            {/* Needs Attention Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-blue-600">bolt</span>
                    <h3 className="font-bold text-lg text-slate-800">Needs Attention</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group hover:border-blue-200 hover:shadow-md cursor-pointer" onClick={() => onNavigate('/persetujuan')}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium">Leave Requests</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-bold text-slate-900">{stats.leaveReqs}</span>
                                    <span className="text-sm font-medium text-orange-500">Pending</span>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-[28px]">calendar_month</span>
                            </div>
                        </div>
                        {stats.leaveReqs > 0 && (
                            <p className="text-xs font-medium text-green-600 flex items-center gap-1 mt-auto">
                                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                Action needed
                            </p>
                        )}
                    </Card>

                    <Card className="p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group hover:border-blue-200 hover:shadow-md cursor-pointer" onClick={() => onNavigate('/persetujuan')}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium">Overtime Claims</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-bold text-slate-900">{stats.overtimeReqs}</span>
                                    <span className="text-sm font-medium text-orange-500">Pending</span>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-[28px]">timer</span>
                            </div>
                        </div>
                        {stats.overtimeReqs > 0 && (
                            <p className="text-xs font-medium text-green-600 flex items-center gap-1 mt-auto">
                                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                Action needed
                            </p>
                        )}
                    </Card>

                    <Card className="p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group hover:border-blue-200 hover:shadow-md cursor-pointer" onClick={() => onNavigate('/persetujuan')}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium">Shift Swaps</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-bold text-slate-900">{stats.shiftSwapReqs}</span>
                                    <span className="text-sm font-medium text-orange-500">Pending</span>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-[28px]">sync_alt</span>
                            </div>
                        </div>
                        {stats.shiftSwapReqs > 0 && (
                            <p className="text-xs font-medium text-green-600 flex items-center gap-1 mt-auto">
                                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                Action needed
                            </p>
                        )}
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Quick Review Section */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-slate-800">Quick Review</h3>
                        <button onClick={() => onNavigate('/persetujuan')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
                    </div>

                    <Card className="overflow-hidden border border-slate-100 shadow-sm bg-white">
                        {pendingRequests.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                <p>All caught up! No pending requests.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Employee</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Request Type</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pendingRequests.slice(0, 5).map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                                            {/* User Avatar Placeholder - We don't have requester avatar in Request payload usually, relying on name */}
                                                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs">
                                                                {req.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{req.full_name}</p>
                                                            <p className="text-xs text-slate-500">{req.profile_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getRequestBadge(req.request_type)}
                                                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[150px]">{req.reason || 'No details'}</p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                                                    {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {req.end_date !== req.start_date && ` - ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Reject">
                                                            <XIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(req)}
                                                            disabled={!!processingId}
                                                            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
                                                        >
                                                            {processingId === req.id ? <Spinner className="w-3 h-3 border-white" /> : <CheckCircleIcon className="w-3 h-3" />}
                                                            Approve
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Weekly Attendance Placeholder */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">Weekly Attendance</h3>
                        <Card className="p-6 flex flex-col items-center justify-center min-h-[200px] bg-white">
                            <div className="w-full h-32 flex items-end justify-between px-2 mb-4 gap-2">
                                {[85, 92, 88, 95, 78, 0, 0].map((h, i) => (
                                    <div key={i} className="w-full bg-slate-100 rounded-t-sm relative group">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-sm transition-all duration-500"
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between w-full text-xs text-slate-400 uppercase font-medium px-1">
                                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                            </div>
                            <div className="w-full mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-sm text-slate-500">Average Presence</span>
                                <span className="text-lg font-bold text-slate-900">88%</span>
                            </div>
                        </Card>
                    </div>

                    {/* Who's Out Today */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-800">Who's Out Today</h3>
                            <button className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                        </div>
                        <Card className="p-4 space-y-4 bg-white">
                            {todayAttendance.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">Everyone is present today!</p>
                            ) : (
                                todayAttendance.map((item) => (
                                    <div key={item.profile.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 overflow-hidden border border-orange-200">
                                                {item.profile.avatar_url ? (
                                                    <img src={item.profile.avatar_url} alt={item.profile.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">{item.profile.full_name.charAt(0)}</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{item.profile.full_name}</p>
                                                <p className="text-xs text-slate-500 capitalize">{item.leaveType?.replace('_', ' ').toLowerCase() || 'Absent'}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-slate-400">All Day</p>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={() => onNavigate('/tim')}
                                className="w-full py-2.5 mt-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
                            >
                                View Team Calendar
                            </button>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-800">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => onNavigate('/tim')}>
                        <span className="material-symbols-outlined text-blue-600">person_add</span>
                        <span className="font-semibold text-slate-700">Assign New Shift</span>
                    </button>
                    <button className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all">
                        <span className="material-symbols-outlined text-purple-600">campaign</span>
                        <span className="font-semibold text-slate-700">Team Announcement</span>
                    </button>
                    <button className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => onNavigate('/laporan-tim')}>
                        <span className="material-symbols-outlined text-slate-600">download</span>
                        <span className="font-semibold text-slate-700">Download Weekly Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AtasanDashboardPage;

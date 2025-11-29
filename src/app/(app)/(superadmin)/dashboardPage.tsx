"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { UserProfile, Request, RequestStatus, RequestType, Department } from '../../../types';
import { apiService } from '../../../services/apiService';
import { UsersIcon, BriefcaseIcon, BellIcon, ClockIcon } from '../../../components/icons';
import { formatDate } from '../../../lib/utils';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';

interface SuperadminDashboardPageProps {
  user: UserProfile;
  allUsers: UserProfile[];
}

const StatCard: React.FC<{ title: string; count: number | string; icon: React.ReactNode; color: string }> = ({ title, count, icon, color }) => (
    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4 transition-transform hover:scale-105 duration-300">
        <div className={`p-4 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{count}</p>
        </div>
    </div>
);

const SuperadminDashboardPage: React.FC<SuperadminDashboardPageProps> = ({ user, allUsers: initialAllUsers }) => {
    const [allUsers, setAllUsers] = useState<UserProfile[]>(initialAllUsers || []);
    const [allRequests, setAllRequests] = useState<Request[]>([]);
    const [structure, setStructure] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const hasInitialUsers = (initialAllUsers || []).length > 0;
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [reqs, orgStructure, usersFallback] = await Promise.all([
                apiService.getAllRequests(200),
                apiService.getOrganizationStructure(),
                hasInitialUsers ? Promise.resolve<UserProfile[] | null>(null) : apiService.getProfiles()
            ]);
            setAllRequests(reqs);
            setStructure(orgStructure);
            if (!hasInitialUsers && usersFallback) {
                setAllUsers(usersFallback);
            }
        } catch(e) {
            console.error("Failed to load superadmin dashboard data:", e);
        } finally {
            setLoading(false);
        }
    }, [hasInitialUsers]);

    useEffect(() => {
        if (hasInitialUsers) {
            setAllUsers(initialAllUsers);
        }
    }, [hasInitialUsers, initialAllUsers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalPegawai = allUsers.filter(u => u.role !== 'superadmin').length;
        
        const pegawaiCutiHariIni = allRequests.filter(req => {
            if (req.request_type !== RequestType.CUTI || req.status !== RequestStatus.APPROVED) return false;
            const start = new Date(req.start_date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(req.end_date);
            end.setHours(0, 0, 0, 0);
            return today >= start && today <= end;
        }).length;

        const ajuanPending = allRequests.filter(req => req.status === RequestStatus.PENDING).length;
        
        // This would require real-time attendance data, which is complex. Mocking for now.
        const pegawaiTerlambatHariIni = 2;

        return { totalPegawai, pegawaiCutiHariIni, ajuanPending, pegawaiTerlambatHariIni };
    }, [allUsers, allRequests]);

    const recentRequests = useMemo(() => {
        return allRequests
            .filter(req => req.status === RequestStatus.PENDING)
            .slice(0, 5);
    }, [allRequests]);
    
    const departmentSummary = useMemo(() => {
        const employees = allUsers.filter(u => u.role !== 'superadmin');
        return structure.map(dept => {
            // A simple matching logic for demonstration
            const deptKeyword = dept.name.replace('DEPARTEMEN ', '').toLowerCase();
            const count = employees.filter(u => u.position && u.position.toLowerCase().includes(deptKeyword)).length;
            return { name: dept.name, count };
        });
    }, [allUsers, structure]);

    if (loading) {
         return (
            <div className="p-6 flex justify-center items-center h-full">
                <Spinner /> <span className="ml-2">Memuat dashboard superadmin...</span>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard Superadmin</h1>
                <p className="text-gray-600">Selamat datang, {user.full_name}. Berikut ringkasan aktivitas perusahaan.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pegawai Aktif" count={stats.totalPegawai} icon={<UsersIcon className="h-7 w-7 text-blue-600" />} color="bg-blue-100" />
                <StatCard title="Pegawai Cuti Hari Ini" count={stats.pegawaiCutiHariIni} icon={<BriefcaseIcon className="h-7 w-7 text-green-600" />} color="bg-green-100"/>
                <StatCard title="Ajuan Pending" count={stats.ajuanPending} icon={<BellIcon className="h-7 w-7 text-yellow-600" />} color="bg-yellow-100" />
                <StatCard title="Pegawai Terlambat Hari Ini" count={stats.pegawaiTerlambatHariIni} icon={<ClockIcon className="h-7 w-7 text-red-600" />} color="bg-red-100" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Ajuan Terbaru (Pending)</h3>
                    <div className="space-y-4">
                        {recentRequests.length > 0 ? recentRequests.map(req => {
                            const requester = allUsers.find(u => u.id === req.profile_id);
                            if (!requester) return null;
                            return (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <img src={requester.avatar_url} alt={requester.full_name} className="h-10 w-10 rounded-full object-cover" />
                                        <div>
                                            <p className="font-semibold text-gray-700">{requester.full_name}</p>
                                            <p className="text-sm text-gray-500">{req.request_type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">{formatDate(new Date(req.created_at))}</p>
                                        <Badge status={req.status} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center text-gray-500 py-8">Tidak ada ajuan pending saat ini.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Pegawai per Departemen</h3>
                    <div className="space-y-3">
                        {departmentSummary.map((dept, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 capitalize">{dept.name.replace('DEPARTEMEN ', '').toLowerCase()}</span>
                                <span className="font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-full">{dept.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperadminDashboardPage;

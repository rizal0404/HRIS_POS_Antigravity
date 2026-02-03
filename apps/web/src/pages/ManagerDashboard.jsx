import React, { useState } from 'react';
import DetailAjuanModal from '../components/modals/DetailAjuanModal';
import { RequestStatus, RequestType } from '../types';

export default function ManagerDashboard() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleViewDetail = (request) => {
        setSelectedRequest(request);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedRequest(null);
    };

    const handleApprove = (id) => {
        console.log(`Approving request ${id}`);
        setIsDetailOpen(false);
    };

    const handleReject = (id, reason) => {
        console.log(`Rejecting request ${id} with reason: ${reason}`);
        setIsDetailOpen(false);
    };

    const handleRevise = (id, notes) => {
        console.log(`Requesting revision for ${id} with notes: ${notes}`);
        setIsDetailOpen(false);
    };

    const getMockRequestDarlene = () => ({
        id: "mock-darlene",
        request_type: RequestType.CUTI,
        status: RequestStatus.PENDING,
        start_date: "2023-10-24",
        end_date: "2023-10-26",
        reason: JSON.stringify({ reason: "Annual Leave", leave_days: 3 }),
        profile_id: "user-darlene",
        employee_name: "Darlene Robertson",
        employee_role: "Employee",
        created_at: "2023-10-24T08:00:00"
    });
    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#1a1f2e] sticky top-0 z-20 shadow-sm">
                <button className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">Dashboard</h1>
                <button className="relative flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-900 dark:text-white">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1f2e]"></span>
                </button>
            </header>

            {/* Web Header */}
            <header className="hidden lg:flex h-20 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 items-center justify-between px-6 lg:px-10 sticky top-0 z-10 transition-all">
                {/* Search Bar */}
                <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 w-full max-w-lg border border-transparent focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:shadow-sm transition-all duration-300">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                    <input className="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400 ml-3" placeholder="Search employees, approvals, or reports..." type="text" />
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">⌘</span>
                        <span className="text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">K</span>
                    </div>
                </div>
                {/* Right Actions */}
                <div className="flex items-center gap-4 ml-auto">
                    <button className="flex items-center justify-center size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    </button>
                    <button className="relative flex items-center justify-center size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        <span className="absolute top-2 right-2.5 size-2 bg-red-500 border border-white dark:border-slate-800 rounded-full animate-pulse"></span>
                    </button>
                </div>
            </header>

            {/* Main Scrollable Area */}
            <main className="flex-1 overflow-y-auto w-full p-0 lg:p-10 scroll-smooth pb-20 lg:pb-10">
                <div className="max-w-7xl mx-auto w-full space-y-6 lg:space-y-8">

                    {/* Greeting & Header Section */}
                    <div className="px-4 pt-6 lg:p-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 flex items-center gap-1 lg:hidden">
                                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                Tuesday, 24 Oct 2023
                            </p>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">Good Morning, Alex!</h2>
                            <p className="text-gray-600 dark:text-slate-400 text-sm lg:text-base lg:font-medium mt-1">Here is your team summary for today.</p>
                        </div>
                        <div className="hidden lg:flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">download</span>
                                Export Report
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary/30 transition-all">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                New Request
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid / Scroll */}
                    <div className="mt-4 px-4 lg:p-0">
                        {/* Mobile Horizontal Scroll */}
                        <div className="flex lg:hidden gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                            {/* Mobile Stat Cards */}
                            <div className="snap-center min-w-[140px] flex-1 flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-[#1a1f2e] shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Hadir</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                                <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center">
                                    <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span> On time
                                </p>
                            </div>
                            <div className="snap-center min-w-[140px] flex-1 flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-[#1a1f2e] shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                        <span className="material-symbols-outlined text-[18px]">beach_access</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cuti</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">2</p>
                                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Planned</p>
                            </div>
                            <div className="snap-center min-w-[140px] flex-1 flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-[#1a1f2e] shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                        <span className="material-symbols-outlined text-[18px]">sick</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sakit</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
                                <p className="text-xs font-medium text-gray-400">Requires proof</p>
                            </div>
                        </div>

                        {/* Web Stats Grid (4 cols) */}
                        <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            {/* Total Present */}
                            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 group hover:border-primary/30 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-xl text-green-600 dark:text-green-400">
                                        <span className="material-symbols-outlined filled">check_circle</span>
                                    </div>
                                    <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full">
                                        +12% <span className="material-symbols-outlined text-[14px] ml-0.5">trending_up</span>
                                    </span>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Present</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">42<span className="text-slate-400 text-lg font-medium">/50</span></h3>
                                </div>
                            </div>
                            {/* On Leave */}
                            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 group hover:border-primary/30 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                                        <span className="material-symbols-outlined filled">flight_takeoff</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">On Leave</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">3</h3>
                                </div>
                            </div>
                            {/* Sick */}
                            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 group hover:border-primary/30 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400">
                                        <span className="material-symbols-outlined filled">sick</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Sick Leave</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">1</h3>
                                </div>
                            </div>
                            {/* Pending Requests */}
                            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 group hover:border-primary/30 hover:shadow-md transition-all relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-primary">
                                        <span className="material-symbols-outlined filled">pending_actions</span>
                                    </div>
                                    <span className="flex size-2 bg-red-500 rounded-full"></span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Pending Requests</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">5</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Split Content (Table + Right Panel) */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-6">
                        {/* Real-time Attendance (Left Column on Web, Bottom on Mobile) */}
                        <div className="xl:col-span-2 flex flex-col gap-5 order-2 lg:order-1 px-4 lg:px-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Real-time Attendance
                                    <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                                </h3>
                                <a className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1" href="#">
                                    View Full Report <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </a>
                            </div>

                            {/* Responsive List/Table */}
                            <div className="bg-white dark:bg-surface-dark rounded-xl lg:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Mobile List */}
                                <ul className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
                                    <li className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img class="size-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDT1qB3cQN_U0QdVn-7hks6Nsw0aZ-ZH7fCB-38ldU-IBOlVY5S0Y4kGmzn3uh865IsmD5vcNuiT73WOdz5BUUDEaZOo-oqJFHZKptrt6zhuFVOzMH-_ihcX7hOYhyd80cztg-mYUp7djpq0SMQ6_SD3Ky_unj_cZWzcnAfeDVIONsGk8RscsaLngpBhDaSJwJS45qXgzbZoV0CwTcKs_-r7Ele8p4mvPv4Vk-zkXXNiW3gdd7OLZiw8gSznSXS6PqRLHJ2SN8tbJA" alt="Michael Brown" />
                                                <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-white dark:border-[#1a1f2e]"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">Michael Brown</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">08:45 AM</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-semibold">On Time</span>
                                    </li>
                                    <li className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img class="size-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-TouoAr_QRg3z4CDbnp8zDmBQRfPcRuqMXdEmeLl6Mo0eYYKcNpvnDiLWGtmyEsWbtpMmmW01o6IvwTQq0SprdfqKyimLlAHAFQdUNO54ewR2GOmaW3Y568IX2X0V0HlIuFB521PWOrd2oNqxuFdb_W0Fe_uS_Vacjb6Ys4VrXyYNu3JjN9cG0-1-UddIHuOHbl2B_FnlDFPlLb1cE9wD33T1piL2siW7xjEMBqLLdSWFhoTUgJEelMVqU7XdW_m-XxpAK1o7ax8" alt="Emily Davis" />
                                                <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-white dark:border-[#1a1f2e]"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">Emily Davis</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">08:58 AM</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-semibold">On Time</span>
                                    </li>
                                </ul>

                                {/* Web Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-xs font-semibold border-b border-slate-100 dark:border-slate-800/50">
                                            <tr>
                                                <th className="px-6 py-4 pl-8">Employee</th>
                                                <th className="px-6 py-4">Check In</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Location</th>
                                                <th className="px-6 py-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {/* Rows */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4 pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBbFSrv7iezyb-W0JBXv8gWtmT7K-O-lBrJSSmYZxJIUPfQ8Vl9POgZlC20VGZpV0u2Z1LUcuA82A5QBigalDEnS1Zg9ORId1CL_HvWwKk9qB6eutcsf7mfMzaa5z6CS8xzkH6DT9vDTr0YIuzjoAShFBur3Wq_a1vNhdW-SaMS9K4Kmc2Ccuxdida0v-rTWnX-GPqWpcZK6PWudpw9NP0b6brEKNaUBetx_GdG1UZCu5ZwfNEdZ_AfOX7SggOLhXRDozhkooJN4fo')" }}></div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white">Cameron Williamson</div>
                                                            <div className="text-xs text-slate-500">Product Designer</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">08:30 AM</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                                                        <span className="size-1.5 rounded-full bg-green-500"></span> On Time
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">Jakarta HQ</td>
                                                <td className="px-6 py-4">
                                                    <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Pending Approvals (Right Column on Web, Middle on Mobile) */}
                        <div className="flex flex-col gap-5 order-1 lg:order-2 px-4 lg:px-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pending Approvals</h3>
                                <a className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1" href="#">
                                    View All (5)
                                </a>
                            </div>
                            <div className="bg-transparent lg:bg-surface-light dark:lg:bg-surface-dark lg:rounded-2xl lg:border lg:border-slate-200 dark:lg:border-slate-800 lg:shadow-sm lg:p-5 flex flex-col gap-4 h-full">
                                {/* Approval Item */}
                                <div className="flex flex-col gap-3 p-4 rounded-xl bg-white lg:bg-slate-50 dark:bg-[#1a1f2e] lg:dark:bg-slate-800/40 border border-gray-100 lg:border-slate-100 dark:border-gray-800 lg:dark:border-slate-800 hover:border-primary/20 transition-all shadow-sm lg:shadow-none">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJ0GQY9B8t0Y1mYrijmrkvd-TtbdX2Aa4qBrM92Mjb3RS_nfxSg0wWQyvqUdjUJdcWN4_BBKA9ah5-qQ_7dlIXk5OMhXf_sq6xU3UmaP1PcA8yClinelQC6FZl0s-Di7BfRAEYvuAcvtsGpEsFbFkRUjwgsITb_692gBgmq0rjz2j76mqNB_EN1Wl1o8scnhYRExH3gO3ClWy7Chkzy-pWcex8D4iRywkYUMgbDeuEZW9Sbd-fKhGBJvyusu78vr54vcJR7NOEi8c')" }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Darlene Robertson</p>
                                                <span className="text-[10px] text-slate-400 font-medium">2h ago</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Annual Leave • Oct 24-26</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-1">
                                        <button
                                            onClick={() => handleViewDetail(getMockRequestDarlene())}
                                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">visibility</span> Lihat Detail
                                        </button>
                                    </div>
                                </div>
                                {/* Add more items as needed */}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <DetailAjuanModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                request={selectedRequest}
                allUsers={[]}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
            />
        </>
    );
}

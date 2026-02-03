import { useState } from 'react';
import { Link } from 'react-router-dom';
import DetailAjuanModal from '../components/modals/DetailAjuanModal';
import { RequestStatus, RequestType } from '../types';

export default function ManagerApprovals() {
    const [selectedTab, setSelectedTab] = useState('pending');
    const [selectedFilter, setSelectedFilter] = useState('all');
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
        // TODO: Call API
        setIsDetailOpen(false);
    };

    const handleReject = (id, reason) => {
        console.log(`Rejecting request ${id} with reason: ${reason}`);
        // TODO: Call API
        setIsDetailOpen(false);
    };

    const handleRevise = (id, notes) => {
        console.log(`Requesting revision for ${id} with notes: ${notes}`);
        // TODO: Call API
        setIsDetailOpen(false);
    };

    // MOCK DATA GENERATORS
    const getMockRequestBudi = () => ({
        id: "mock-1",
        request_type: RequestType.CUTI,
        status: RequestStatus.PENDING,
        start_date: "2024-11-12",
        end_date: "2024-11-15",
        reason: JSON.stringify({ reason: "Family wedding attendance", leave_days: 4 }),
        profile_id: "user-1",
        employee_name: "Budi Santoso",
        employee_role: "Senior Developer",
        created_at: "2023-10-24"
    });

    const getMockRequestSarah = () => ({
        id: "mock-2",
        request_type: RequestType.LEMBUR,
        status: RequestStatus.PENDING,
        start_date: "2023-10-25",
        end_date: "2023-10-25",
        start_time: "18:00",
        end_time: "21:00",
        reason: "Project \"Orion\" launch deadline",
        profile_id: "user-2",
        employee_name: "Sarah Jenkins",
        employee_role: "Product Designer",
        created_at: "2023-10-25T16:00:00"
    });

    const getMockRequestElena = () => ({
        id: "mock-3",
        request_type: RequestType.KOREKSI,
        status: RequestStatus.PENDING,
        start_date: "2023-10-20",
        start_time: "09:00",
        end_time: "18:00",
        reason: JSON.stringify({ type: "missed_out", reason: "Forgot to clock out", intended_iso: "2023-10-20T18:00:00" }),
        profile_id: "user-3",
        employee_name: "Elena Rodriguez",
        employee_role: "QA Engineer",
        created_at: "2023-10-21"
    });

    return (
        <>
            {/* Mobile Header (Hidden on Web) */}
            <div className="lg:hidden sticky top-0 z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link to="/manager" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Approval Center</h1>
                    <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-2xl">filter_list</span>
                    </button>
                </div>
                {/* Tabs Mobile */}
                <div className="px-4">
                    <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
                        <button onClick={() => setSelectedTab('pending')} className={`flex-1 pb-3 text-sm font-semibold transition-colors ${selectedTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 border-b-2 border-transparent hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            Pending <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">4</span>
                        </button>
                        <button onClick={() => setSelectedTab('approved')} className={`flex-1 pb-3 text-sm font-semibold transition-colors ${selectedTab === 'approved' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 border-b-2 border-transparent hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            Approved
                        </button>
                        <button onClick={() => setSelectedTab('rejected')} className={`flex-1 pb-3 text-sm font-semibold transition-colors ${selectedTab === 'rejected' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 border-b-2 border-transparent hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            Rejected
                        </button>
                    </div>
                </div>
            </div>

            {/* Web Header (Hidden on Mobile) */}
            <header className="hidden lg:flex w-full px-6 py-8 flex-shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col gap-6 w-full">
                    {/* Title & Search */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">Approval Center</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">Review and manage pending employee requests</p>
                        </div>
                        {/* Search Bar */}
                        <div className="w-full md:w-96">
                            <label className="relative flex items-center w-full group">
                                <span className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">search</span>
                                <input className="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-slate-900 dark:text-white" placeholder="Search requests by employee name, type..." type="text" />
                            </label>
                        </div>
                    </div>
                    {/* Tabs Desktop */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <button onClick={() => setSelectedTab('pending')} className={`px-1 pb-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap mr-6 ${selectedTab === 'pending' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent'}`}>
                            All Requests (5)
                        </button>
                        <button onClick={() => setSelectedTab('annual')} className={`px-1 pb-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap mr-6 ${selectedTab === 'annual' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent'}`}>
                            Annual Leave
                        </button>
                        <button onClick={() => setSelectedTab('overtime')} className={`px-1 pb-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap mr-6 ${selectedTab === 'overtime' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent'}`}>
                            Overtime
                        </button>
                        <button onClick={() => setSelectedTab('correction')} className={`px-1 pb-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap mr-6 ${selectedTab === 'correction' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent'}`}>
                            Absence Corrections
                        </button>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-12 pt-2 lg:pt-0 no-scrollbar relative z-10">
                {/* Mobile Filter Chips (Hidden on Desktop) */}
                <div className="lg:hidden flex gap-3 overflow-x-auto no-scrollbar pb-6 sticky top-0 z-30 pt-4 bg-background-light dark:bg-background-dark -mx-4 px-4">
                    {['All', 'Annual Leave', 'Overtime', 'Remote Work'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setSelectedFilter(filter.toLowerCase())}
                            className={`flex items-center justify-center px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap shadow-sm transition-colors ${selectedFilter === filter.toLowerCase() ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="max-w-5xl mx-auto flex flex-col gap-6">

                    {/* Card 1: Leave with Substitution */}
                    <article className="bg-white dark:bg-[#151f32] lg:dark:bg-[#151f32] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 lg:border-slate-200 lg:dark:border-slate-800 overflow-hidden">
                        {/* Card Header */}
                        <div className="p-4 lg:p-5 flex flex-col lg:gap-6">
                            <div className="flex items-start justify-between mb-4 lg:mb-0">
                                <div className="flex gap-3 lg:gap-4">
                                    <div className="relative">
                                        <img alt="Portrait of Budi Santoso" className="size-12 rounded-full object-cover border border-slate-100 dark:border-slate-700 lg:shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ1PxF6nH24eIff5v-Y4sr2xYoT70hjbgYc7VG8cdXp_7JXQlwIyq3n1pvzUIjD4bhFZwVXCF4Ah9S4D1IhhArlYxukYL6AB0VrMimJBZ-MbrFfdUurf17d_bLLB7YFeyax6ZgsNKbTtqjoGzaXJiOjm0NgN4nkujJZpRBYN6lLTgbvjsh54qrq9yCrUzZPV_1qd6Ql6fMeLeWMrN-WdpTxfhUmO1O2fezG7j4e9MlXxM-bwY96l8XDxq5P4Lyzz6DIgeGlhi1zr4" />
                                        <div className="hidden lg:block absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-[#151f32]">
                                            <div className="size-2 rounded-full bg-white"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight lg:text-base">Budi Santoso</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Senior Developer <span className="hidden lg:inline">• Submitted Oct 24</span></p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-xs font-medium lg:font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 lg:bg-amber-50 lg:text-amber-700 lg:dark:bg-amber-900/30 lg:dark:text-amber-300 lg:border lg:border-amber-100 lg:dark:border-amber-800">
                                    <span className="material-symbols-outlined text-[16px] hidden lg:inline">flight_takeoff</span>
                                    Annual Leave
                                </span>
                            </div>

                            {/* Request Details Grid (Desktop) / Column (Mobile) */}
                            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-4 bg-transparent lg:bg-slate-50 lg:dark:bg-slate-900/50 lg:p-4 lg:rounded-lg lg:border lg:border-slate-100 lg:dark:border-slate-800 mb-4 lg:mb-0">
                                {/* Mobile Details Style */}
                                <div className="lg:hidden flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mb-1">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>calendar_month</span>
                                    <span className="font-medium">Aug 12 - Aug 14</span>
                                    <span className="text-slate-400 mx-1">•</span>
                                    <span className="text-slate-500 dark:text-slate-400">3 Days</span>
                                </div>
                                <div className="lg:hidden">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        Attending my sister's wedding in Bali. I have already pushed my code for the sprint.
                                    </p>
                                </div>

                                {/* Desktop Details Style */}
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Dates</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Nov 12 - Nov 15</span>
                                </div>
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Duration</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">4 Days</span>
                                </div>
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Reason</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Family wedding attendance</span>
                                </div>
                            </div>

                            {/* Substitution Module */}
                            <div className="border-t border-slate-100 dark:border-slate-800 lg:border-0 pt-4 lg:pt-0">
                                <div className="bg-primary/5 dark:bg-primary/10 lg:rounded-lg p-4 lg:border lg:border-primary/10 lg:dark:border-primary/20 flex flex-col gap-3 lg:gap-4 -mx-4 lg:mx-0">
                                    {/* Header */}
                                    <div className="flex items-center justify-between lg:justify-start lg:gap-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 lg:text-primary lg:font-semibold">
                                            <span className="material-symbols-outlined text-primary text-lg lg:text-[20px]">group_add</span>
                                            <span className="lg:hidden text-primary">Rekomendasi Pengganti</span>
                                            <span className="hidden lg:inline text-primary">AI Suggested Replacement</span>
                                        </h4>
                                        <span className="lg:hidden text-xs text-primary font-medium hover:underline cursor-pointer">View All</span>
                                    </div>

                                    {/* Mobile Radio Options */}
                                    <div className="space-y-3 lg:hidden">
                                        <label className="flex items-center p-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-primary shadow-sm cursor-pointer relative transition-all">
                                            <input type="radio" name="substitute_1" className="sr-only" defaultChecked />
                                            <div className="absolute top-3 right-3 text-primary">
                                                <span className="material-symbols-outlined text-xl">check_circle</span>
                                            </div>
                                            <img alt="Portrait of Siti Aminah" className="size-10 rounded-full object-cover mr-3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrmeI5vil7a4p0vG2_3JeyzB_QGRzSceHeYXtoWXKxxoEws93jJ5Le9DSVQqdnvSpcrnwa39NrNzOmpjPupBTCrtv-lf4Gj-Rl1y3A_RVYGGA6s1JW9zUuQyk2PdyBOn1QydyV3ExcE9mDEuyQzGxRIVVx6HHNtCfWR4yqR_t_o_hxnOaIauxo1xf1BjDpmk5KOeXVH1OiaxFnjEZ5-IiO2eGX6tU0lIBtlVre_3AqLjBUD6T3-4G8etgK_p_-rZE-XdG__CRODW8" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Siti Aminah</p>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded">98% Match</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">React, Node.js</p>
                                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">30/40 hrs</p>
                                                </div>
                                            </div>
                                        </label>
                                        <label className="flex items-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer relative transition-all opacity-80 hover:opacity-100">
                                            <input type="radio" name="substitute_1" className="sr-only" />
                                            <div className="absolute top-3 right-3 text-slate-300 dark:text-slate-600">
                                                <span className="material-symbols-outlined text-xl">radio_button_unchecked</span>
                                            </div>
                                            <img alt="Portrait of Ahmad Rizki" className="size-10 rounded-full object-cover mr-3 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAECsNvi-LEMNtDsnWaHmSEUZMeL3U4nbVFDRuedJilv9kB4W7Ma5K7I5V0aNr-LKxoYVCSA-aUTLnjtBxS69sMHRcdBTmU-C04ucRtOciEA-Iq00dRq-Ns-T0RZCrSRkl0oJqs7Ect4kUP578foOS1_DCtp61AsD6bOg6QlOipkSvriEMbZLOfX6XX9ApL7qd1fP4_Gap4gEFEkfNEj6Zv7IXoJ8BcSmM8la3xtP7KlbFib5-TGCeuxMtwAMZqhsmsyAmioFCc2DE" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Ahmad Rizki</p>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded">80% Match</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Node.js</p>
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">warning</span> 42/40 hrs
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Desktop Detailed Option */}
                                    <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <img className="size-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNJJlUo-6rn8wCYA3B35-0XT-WY7CZP0umvT0hIMsl5QNLWrv6pDXHXjPmzlwv5mIsfgvNearL0PBEwSb38I8ezVe7HWBzGDUOhr8hf_ecZu8aMSUffHV_fJFO_hsZ4o5Ha18BCctCfd023pnN9fM8aw27zDxxM6t98ZIUsxA2_i3VWfFwQE-nlWwEy3fcARHIZaMM88fy5p4Q0RkRQHQkI9noAept0V2j62yKn-ZBiUk8DwklsDy65lM2s4paTv3ZV84znXRr-K8" alt="Mark Otto" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Mark Otto</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Mid-level Designer</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 flex-1 sm:justify-end">
                                            <div className="flex flex-col gap-1 min-w-[120px]">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">Skill Match</span>
                                                    <span className="text-primary font-bold">95%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-primary h-full rounded-full" style={{ width: "95%" }}></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-right">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Current Load</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">32h <span className="text-slate-400 font-normal">/ 40h</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-4 pt-3 flex flex-row lg:justify-end gap-3 lg:pt-2 lg:border-t lg:border-slate-100 lg:dark:border-slate-800">
                                <button
                                    onClick={() => handleViewDetail(getMockRequestBudi())}
                                    className="flex-[2] lg:flex-none py-3 lg:py-2 px-4 rounded-lg bg-primary text-white font-bold lg:font-semibold text-sm shadow-md lg:shadow-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="lg:hidden">Lihat Detail</span>
                                    <span className="hidden lg:inline">View Detail</span>
                                    <span className="material-symbols-outlined text-sm lg:text-[18px]">visibility</span>
                                </button>
                            </div>
                        </div>
                    </article>

                    {/* Card 2: Overtime Request */}
                    <article className="bg-white dark:bg-[#151f32] lg:dark:bg-[#151f32] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 lg:border-slate-200 lg:dark:border-slate-800 overflow-hidden">
                        <div className="p-4 lg:p-5 flex flex-col lg:gap-6">
                            <div className="flex items-start justify-between mb-4 lg:mb-0">
                                <div className="flex gap-3 lg:gap-4">
                                    <img alt="Portrait of Sarah Jenkins" className="size-12 rounded-full object-cover border border-slate-100 dark:border-slate-700 lg:shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9hRNe1kDFIQCatzLCqUDS9DJbku7bruhumjSianfOl3_2yzoHgHt2gpUq0vg4VRy_izyncLKJueFbdoPp21Pdu99j5CyxktQ2DwO2Vew16_78kzGqNaiylk4fG3NNiBp8NpTx6WJ5AMr-G7wCgaVdEpPrJdg_t4DcElpilsHKHMBQVJTnzLcTfjBSf1_ULF_37adGmJBr4sNmrnKuj7g2d7h4J9vyU_lizMybXB7Z37JE4TapPOgrhIrFkTfgAmyM2QmW2nD6KmI" />
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight lg:text-base">Sarah Jenkins</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Product Designer <span className="hidden lg:inline">• Submitted 2 hrs ago</span></p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-xs font-medium lg:font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 lg:bg-purple-50 lg:text-purple-700 lg:dark:bg-purple-900/30 lg:dark:text-purple-300 lg:border lg:border-purple-100 lg:dark:border-purple-800">
                                    <span className="material-symbols-outlined text-[16px] hidden lg:inline">schedule</span>
                                    Overtime
                                </span>
                            </div>

                            {/* Request Details */}
                            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-4 bg-transparent lg:bg-slate-50 lg:dark:bg-slate-900/50 lg:p-4 lg:rounded-lg lg:border lg:border-slate-100 lg:dark:border-slate-800">
                                {/* Mobile */}
                                <div className="lg:hidden flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mb-1">
                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400" style={{ fontSize: "20px" }}>schedule</span>
                                    <span className="font-medium">Aug 10 • 18:00 - 21:00</span>
                                    <span className="text-slate-400 mx-1">•</span>
                                    <span className="text-slate-500 dark:text-slate-400">3 Hours</span>
                                </div>
                                <div className="lg:hidden">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        Need to finalize the Q3 prototypes before the stakeholder meeting on Monday.
                                    </p>
                                </div>

                                {/* Desktop */}
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Date</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Oct 25, 2023</span>
                                </div>
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Additional Hours</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">2.5 Hours</span>
                                </div>
                                <div className="hidden lg:flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Reason</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Project "Orion" launch deadline</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-4 pt-3 flex gap-3 border-t border-slate-100 dark:border-slate-800 mt-2 lg:mt-0 lg:justify-end lg:pt-2">
                                <button
                                    onClick={() => handleViewDetail(getMockRequestSarah())}
                                    className="flex-[2] lg:flex-none py-3 lg:py-2 px-4 rounded-lg bg-primary text-white font-bold lg:font-semibold text-sm shadow-md lg:shadow-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="lg:hidden">Lihat Detail</span>
                                    <span className="hidden lg:inline">View Detail</span>
                                    <span className="material-symbols-outlined text-sm lg:text-[18px]">visibility</span>
                                </button>
                            </div>
                        </div>
                    </article>

                    {/* Card 3: Absence Correction (Desktop Only content, simple mobile fallback) */}
                    <article className="hidden lg:block bg-white dark:bg-[#151f32] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 flex flex-col gap-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-12 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgTHviyQeROyapBwRnM_PyVGhJYzLqhFDrw8xnx0S4d5kagEsz2aO8UnH2pqmQ2CqpZmqpec-nonc5Zx2IDBmCogRq8skkpH2LGRL6SYVCD1Y4T5hW1dWwTwer_VulIIsZzJIbB5NxzoaVzc898eMU0FkYq4eT89Jq_nGd5yO1w5H0bMNDIJFPS6e6R4fGGztdSnyMQ3B0TEi2tgXOtcfXsFfG2u3kKlWOdq_8vDDCC3NxKGPARvXAsG-HAu78LT9UOQ0daMK0jBk")' }}></div>
                                    <div className="flex flex-col">
                                        <h3 className="text-slate-900 dark:text-white text-base font-bold">Elena Rodriguez</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">QA Engineer • Submitted Yesterday</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-100 dark:border-rose-800">
                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                    Absence Correction
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Incident Date</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Oct 20, 2023</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Correction Detail</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">Forgot to clock out (System auto-logged 6pm)</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => handleViewDetail(getMockRequestElena())}
                                    className="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    View Detail
                                </button>
                            </div>
                        </div>
                    </article>
                </div>
                <div className="h-12 lg:h-6"></div> {/* Spacer */}
            </div>

            {/* Mobile Bottom Bar (Optional, matches screenshot) */}
            <div className="lg:hidden fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full z-50"></div>

            <DetailAjuanModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                request={selectedRequest}
                allUsers={[]} // Pass appropriate users if available or empty
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
            />
        </>
    );
}

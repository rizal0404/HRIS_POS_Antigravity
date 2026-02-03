import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function ManagerSidebar() {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <aside className="w-72 flex-col bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 hidden lg:flex z-20 sticky top-0 h-screen">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
                <div className="size-10 bg-primary rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white">grid_view</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">HRIS Portal</h1>
                    <p className="text-xs text-slate-500 font-medium">Manager View</p>
                </div>
            </div>
            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Overview</div>

                <Link to="/manager" className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/manager') ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary'}`}>
                    <span className={`material-symbols-outlined text-[22px] ${isActive('/manager') ? 'filled' : ''}`}>dashboard</span>
                    <span className="font-medium text-sm">Dashboard</span>
                </Link>

                <a className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all" href="#">
                    <span className="material-symbols-outlined text-[22px]">group</span>
                    <span className="font-medium text-sm">Team Members</span>
                </a>

                <Link to="/manager/schedule" className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/manager/schedule') ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary'}`}>
                    <span className={`material-symbols-outlined text-[22px] ${isActive('/manager/schedule') ? 'filled' : ''}`}>calendar_month</span>
                    <span className="font-medium text-sm">Schedule Mgmt</span>
                </Link>

                <Link to="/manager/approvals" className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/manager/approvals') ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary'}`}>
                    <span className={`material-symbols-outlined text-[22px] ${isActive('/manager/approvals') ? 'filled' : ''}`}>fact_check</span>
                    <span className="font-medium text-sm">Approval Center</span>
                    <span className={`ml-auto py-0.5 px-2 rounded-full text-[10px] font-bold ${isActive('/manager/approvals') ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>5</span>
                </Link>

                <div className="px-4 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Management</div>

                <a className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all" href="#">
                    <span className="material-symbols-outlined text-[22px]">bar_chart</span>
                    <span className="font-medium text-sm">Reports</span>
                </a>

                <a className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all" href="#">
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    <span className="font-medium text-sm">Settings</span>
                </a>
            </nav>
            {/* User Profile */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="relative">
                        <div className="size-11 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDVfXMeOiHLWNDHXcUCm5gFOPEf-NSBtv19GNxuezbs-ovbW7xyVqCJUqW-7yuWiiDgKPAuqfkG8p-57i7QqiZ8x06dYFFvA2sZm7ahYO-xZJuQ1GYA3aGez3IOIWgxeWwHTpDTLcARHOLlwjajyoHsg3FrnL1pz_ICohoMr6TAe8XzKQt-Y8eJU1rZuFY-xpqpepQiJwpc00Q9QlH8usJC2hvRdECSrRnVwVdJ29iiiaP5gf43b1kVv8bUYqsGsO6m9mpNEXumS8c')" }}></div>
                        <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">Leslie Alexander</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Human Resources Manager</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </div>
            </div>
        </aside>
    );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function ManagerSchedule() {
    return (
        <>
            {/* Mobile Header (Hidden on Web) */}
            <div className="lg:hidden sticky top-0 z-20 bg-white/90 dark:bg-[#101922]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link to="/manager" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-white">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </Link>
                    <div className="flex flex-col items-center">
                        <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">Shift Calendar</h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Team Alpha</span>
                    </div>
                    <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-primary">
                        <span className="material-symbols-outlined">filter_list</span>
                    </button>
                </div>
            </div>

            {/* Web Header (Hidden on Mobile) */}
            <header className="hidden lg:flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark px-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative hidden w-64 md:block">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">search</span>
                        <input className="h-10 w-full rounded-xl border-none bg-slate-100 dark:bg-slate-800/50 py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all" placeholder="Search employees..." type="text" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-primary dark:text-slate-300 transition-colors shadow-sm">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-primary dark:text-slate-300 transition-colors shadow-sm">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                    <button className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>New Shift</span>
                    </button>
                </div>
            </header>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto scroll-smooth bg-slate-50 dark:bg-[#101922] lg:bg-transparent lg:p-6">

                {/* Mobile View Content */}
                <div className="lg:hidden">
                    <div className="px-4 pt-4 pb-2 bg-white dark:bg-[#101922]">
                        {/* Month Selector */}
                        <div className="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1">
                            <button className="flex items-center justify-center size-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <p className="text-base font-bold text-slate-900 dark:text-white">October 2023</p>
                            <button className="flex items-center justify-center size-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-y-2 mb-2">
                            <div className="text-center text-xs font-semibold text-slate-400">S</div>
                            <div className="text-center text-xs font-semibold text-slate-400">M</div>
                            <div className="text-center text-xs font-semibold text-slate-400">T</div>
                            <div className="text-center text-xs font-semibold text-slate-400">W</div>
                            <div className="text-center text-xs font-semibold text-slate-400">T</div>
                            <div className="text-center text-xs font-semibold text-slate-400">F</div>
                            <div className="text-center text-xs font-semibold text-slate-400">S</div>

                            <div className="h-10 w-full"></div><div className="h-10 w-full"></div><div className="h-10 w-full"></div>

                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="text-sm font-medium">1</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="text-sm font-medium">2</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="text-sm font-medium">3</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className="text-sm font-medium">4</span>
                                <div className="flex gap-0.5 mt-0.5"><div className="size-1 rounded-full bg-primary"></div><div className="size-1 rounded-full bg-yellow-400"></div></div>
                            </button>
                            <button className="relative h-10 w-full flex flex-col items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-blue-200 dark:shadow-none">
                                <span className="text-sm font-bold">5</span>
                                <div className="flex gap-0.5 mt-0.5"><div className="size-1 rounded-full bg-white"></div><div className="size-1 rounded-full bg-white/60"></div></div>
                            </button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className="text-sm font-medium">6</span>
                                <div className="flex gap-0.5 mt-0.5"><div className="size-1 rounded-full bg-yellow-400"></div></div>
                            </button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="text-sm font-medium">7</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">8</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">9</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">10</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">11</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">12</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-700 dark:text-slate-300"><span className="text-sm font-medium">13</span></button>
                            <button className="h-10 w-full flex flex-col items-center justify-center rounded-lg text-slate-400 dark:text-slate-600"><span className="text-sm font-medium">...</span></button>
                        </div>
                        <div className="flex justify-center pb-2">
                            <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 px-4 py-2 bg-white dark:bg-[#101922]">
                        <button className="flex-1 flex items-center justify-center gap-2 h-11 px-4 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-transform">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Tambah Shift</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 h-11 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl active:scale-[0.98] transition-transform">
                            <span className="material-symbols-outlined text-[20px]">content_copy</span>
                            <span>Template</span>
                        </button>
                    </div>

                    {/* Shift Filters */}
                    <div className="sticky top-[60px] z-10 bg-white dark:bg-[#101922] pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center px-4 gap-6 overflow-x-auto no-scrollbar">
                            <button className="flex flex-col items-center pb-3 border-b-[2px] border-slate-900 dark:border-white min-w-[3rem]">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">All</span>
                            </button>
                            <button className="flex flex-col items-center pb-3 border-b-[2px] border-transparent min-w-[3rem]">
                                <span className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">Pagi</span>
                                <span className="text-[10px] text-slate-400 font-normal">06-14</span>
                            </button>
                            <button className="flex flex-col items-center pb-3 border-b-[2px] border-transparent min-w-[3rem]">
                                <span className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">Siang</span>
                                <span className="text-[10px] text-slate-400 font-normal">14-22</span>
                            </button>
                            <button className="flex flex-col items-center pb-3 border-b-[2px] border-transparent min-w-[3rem]">
                                <span className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">Malam</span>
                                <span className="text-[10px] text-slate-400 font-normal">22-06</span>
                            </button>
                            <button className="flex flex-col items-center pb-3 border-b-[2px] border-transparent min-w-[3rem]">
                                <span className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">OFF</span>
                            </button>
                        </div>
                    </div>

                    {/* Shift List */}
                    <div className="flex-1 bg-slate-50 dark:bg-[#101922] px-4 py-4 space-y-3 pb-24">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Thursday, Oct 5</p>
                            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">4 Shifts</span>
                        </div>
                        <div className="group relative flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <img className="size-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUuDNUfUSAaO98KSK9fZqYlzVXomZdmEoL2XDFwflnDeia0qrKv_sll5EEJgqsLtM2U6F6nPSlg4KbajQ4ObUVGxnxb_SptWFfx0Q6fRbI7SgmMHjDBo_hJ8aoYCV-0iuqXudj_zAI4xVx6iG7mbBUKA9dUOXHLIAPS5wqNn7FhjlLTWGV-TF72WGUMnOQoCJBQQ_9jjiqX2NHIMVPOKO7VW6T0fFcdyJUhIGpj4To9hBxsvBLcbiNwyAzH2Frl8f5drp1Y08uOhc" alt="Sarah" />
                            <div className="ml-3 flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Sarah Jenkins</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Cashier</p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">Pagi</span>
                                </div>
                                <div className="mt-1 flex items-center text-xs text-slate-400">
                                    <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                                    06:00 - 14:00
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 scale-[1.02] -rotate-1">
                            <div className="flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lifted border-2 border-primary ring-2 ring-primary/20">
                                <div className="cursor-grab text-slate-400 dark:text-slate-500 mr-2">
                                    <span className="material-symbols-outlined">drag_indicator</span>
                                </div>
                                <img className="size-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5HmZzP1wGrRsCMz303LJKRp6pMc4rjnfmt5sF2icr6GqFTUKlfV9osCytJuOsBh7hi_MCwTVqY4K6KDbYlFNYyq45kjAK0OiYSyqIXDeJ1VIlQe9SYvH6HB2nIzYh3RrlLH4Y7e4MwtVW3lgiDKFop4hYbUTiB-cbJFmPJtG-3tMREitu7pmlnoxUDBdK4d8oUFm9QDi3pzyLlojA2Ub7QB87Z0Kmjp3G2v_DLTJOx4NRvwyqaq7x88KL4cKwkpX7BqzDuC_IWdE" alt="Michael" />
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Michael Chen</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Manager</p>
                                        </div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Siang</span>
                                    </div>
                                    <div className="mt-1 flex items-center text-xs text-slate-400">
                                        <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                                        14:00 - 22:00
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 left-0 right-0 h-1 bg-primary/50 rounded-full mx-4"></div>
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 opacity-60">
                            <img className="size-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK6uWS4IANUIn9zNNGQqAXVDq2fLgfAy38ewCvVBIxtdK3lkfl5I7VOgoLF3qGzpPKDzV7GEkNlDSwHsyIbocYnxlcXA5BsOz3U0jHNBfHfqzQIwQGpIn49z35tGhyYs0_LVKo2ns7tbi0ho00sidOf0E5FOdAj2QOzG1yxhsY6a62RQvAEhkUppKEcXSe1Si-3EKx2vF2aeNd8pOpLfZINIv4ZxCEyiND-oxXZbGQMJlcRj3AZOuisUMMu9vKtigQkWnlIa-hxcg" alt="Jessica" />
                            <div className="ml-3 flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Jessica Wu</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Security</p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Malam</span>
                                </div>
                                <div className="mt-1 flex items-center text-xs text-slate-400">
                                    <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                                    22:00 - 06:00
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <img className="size-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9D2fEUN5c-YLx5GGgPuogGiA-qnzsu8dlwhRYQYCPAjdSwUy6XTqvG83aTPyvydYa9IdA9YUcK6O7X5Qzmo_vl3Xy5UENDkTrTnNrvQqacDCmYVZ_jzR0ON1H9p1pLwZYKG4EIoGgUUUCP6LQU3unLtbIbNCDSzgU8kdq02Rl2exnpIYaXzNTwn166ojRw7cK0cW3C1Hf8GddC5yF4IrTb_8OLCeo1iI_4ZqlSEnzROnURrmChTx5YZVGmXA0ZhgY2n3X0_tuoGQ" alt="David" />
                            <div className="ml-3 flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">David Park</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Inventory</p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">OFF</span>
                                </div>
                                <div className="mt-1 flex items-center text-xs text-slate-400">
                                    <span className="material-symbols-outlined text-[14px] mr-1">block</span>
                                    Rest Day
                                </div>
                            </div>
                        </div>
                        <button className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <span className="material-symbols-outlined mb-1">add_circle_outline</span>
                            <span className="text-xs font-medium">Assign new shift</span>
                        </button>
                    </div>

                    {/* Bottom Nav */}
                    <div className="sticky bottom-0 bg-white dark:bg-[#101922] border-t border-slate-100 dark:border-slate-800 flex justify-around items-center py-2 pb-5 z-30">
                        <Link to="/manager" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary">
                            <span className="material-symbols-outlined text-[24px]">dashboard</span>
                            <span className="text-[10px] font-medium">Home</span>
                        </Link>
                        <button className="flex flex-col items-center gap-1 p-2 text-primary">
                            <span className="material-symbols-outlined text-[24px] filled">calendar_month</span>
                            <span className="text-[10px] font-medium">Schedule</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary">
                            <span className="material-symbols-outlined text-[24px]">groups</span>
                            <span className="text-[10px] font-medium">Teams</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary">
                            <span className="material-symbols-outlined text-[24px]">settings</span>
                            <span className="text-[10px] font-medium">Settings</span>
                        </button>
                    </div>
                </div>

                {/* Desktop View Content */}
                <div className="hidden lg:flex flex-col gap-6 w-full">
                    {/* Page Controls */}
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Schedule</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>October 2023</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                <span>Monthly View</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/50">
                                <button className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Day</button>
                                <button className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Week</button>
                                <button className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white">Month</button>
                            </div>
                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined text-[18px]">download</span> Export
                                </button>
                                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-md shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-[18px]">publish</span> Publish
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Templates Bar */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1a1f2e]">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400">drag_indicator</span>
                                Shift Templates (Drag to assign)
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-blue-500"></div> Pagi (Morning)</div>
                                <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-orange-500"></div> Siang (Afternoon)</div>
                                <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-purple-500"></div> Malam (Night)</div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="group flex cursor-grab active:cursor-grabbing items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-2 pr-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-900/50 dark:bg-blue-900/20">
                                <div className="flex size-8 items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                                    <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-blue-900 dark:text-blue-100">Morning Shift</span>
                                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-300">08:00 - 16:00</span>
                                </div>
                            </div>
                            <div className="group flex cursor-grab active:cursor-grabbing items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-2 pr-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-orange-900/50 dark:bg-orange-900/20">
                                <div className="flex size-8 items-center justify-center rounded bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400">
                                    <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-orange-900 dark:text-orange-100">Afternoon Shift</span>
                                    <span className="text-[10px] font-medium text-orange-600 dark:text-orange-300">16:00 - 00:00</span>
                                </div>
                            </div>
                            <div className="group flex cursor-grab active:cursor-grabbing items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-2 pr-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/50 dark:bg-purple-900/20">
                                <div className="flex size-8 items-center justify-center rounded bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                                    <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-purple-900 dark:text-purple-100">Night Shift</span>
                                    <span className="text-[10px] font-medium text-purple-600 dark:text-purple-300">00:00 - 08:00</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Create Template
                            </button>
                        </div>
                    </div>

                    {/* Calendar Table */}
                    <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a1f2e] flex flex-col">
                        <div className="overflow-hidden border-b border-slate-200 dark:border-slate-800 flex shrink-0">
                            <div className="w-64 shrink-0 bg-slate-50 p-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-slate-800 dark:text-gray-400 border-r border-slate-200 dark:border-slate-800">Employee</div>
                            <div className="flex flex-1 overflow-hidden">
                                <div className="flex min-w-full">
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mon</span><span className="text-sm font-bold text-gray-900 dark:text-white">01</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10"><span className="text-xs font-medium text-primary dark:text-blue-400">Tue</span><span className="text-sm font-bold text-primary dark:text-blue-400">02</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Wed</span><span className="text-sm font-bold text-gray-900 dark:text-white">03</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Thu</span><span className="text-sm font-bold text-gray-900 dark:text-white">04</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fri</span><span className="text-sm font-bold text-gray-900 dark:text-white">05</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800 bg-gray-50/50 dark:bg-gray-800/50"><span className="text-xs font-medium text-gray-400">Sat</span><span className="text-sm font-bold text-gray-500">06</span></div>
                                    <div className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-200 py-2 text-center dark:border-slate-800 bg-gray-50/50 dark:bg-gray-800/50"><span className="text-xs font-medium text-gray-400">Sun</span><span className="text-sm font-bold text-gray-500">07</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <div className="min-w-full">
                                {/* Row 1 */}
                                <div className="flex min-w-fit border-b border-slate-200 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                                    <div className="sticky left-0 z-10 w-64 shrink-0 border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#1a1f2e] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAO27hg7wfY8-geTjtkZlwY5gY4z9pgcft3odcTNFjSWcHXFH2FCue9fFao8JpW4a6cEpUzDKi622G1lFgu99_tFEzVmqnzz3k73kCVq9pV_Sv_ZZOxCmoMe7ZQQLCRFK40GarZBdnXLGO4o6CMpNimY0vra-3nRHWfllSd06EHURTtu7_OEgI0c9AdYBHowP5AHBzoD9JFQElkXElwtQyiU54xQQCZg6B-iC-9cw7oSEQXSphQRWMtF6ukkxE-VwLvsB7i5Fdc6p4')" }}></div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">John Doe</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Senior Cashier</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">32h / 40h</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1">
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-blue-200 bg-blue-100 p-2 transition-shadow hover:shadow-md dark:border-blue-800 dark:bg-blue-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">Pagi</span></div>
                                                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">08:00 - 16:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-blue-50/20 p-2 dark:border-slate-800 dark:bg-blue-900/5">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-blue-200 bg-blue-100 p-2 transition-shadow hover:shadow-md dark:border-blue-800 dark:bg-blue-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">Pagi</span></div>
                                                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">08:00 - 16:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800"></div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-orange-200 bg-orange-100 p-2 transition-shadow hover:shadow-md dark:border-orange-800 dark:bg-orange-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">Siang</span></div>
                                                <p className="text-xs font-medium text-orange-900 dark:text-orange-100">16:00 - 00:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-orange-200 bg-orange-100 p-2 transition-shadow hover:shadow-md dark:border-orange-800 dark:bg-orange-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">Siang</span></div>
                                                <p className="text-xs font-medium text-orange-900 dark:text-orange-100">16:00 - 00:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-gray-50/50 p-2 dark:border-slate-800 dark:bg-gray-800/30"></div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-gray-50/50 p-2 dark:border-slate-800 dark:bg-gray-800/30"></div>
                                    </div>
                                </div>
                                {/* Row 2 */}
                                <div className="flex min-w-fit border-b border-slate-200 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                                    <div className="sticky left-0 z-10 w-64 shrink-0 border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#1a1f2e] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD21lwGi30IYNfWAVnlKAuaTJ5T5Or0do34woZrsl9EURgUaMO0RbBczr6MbvHp9zEfgrh999ivxFLJMKc_ypLk_5KLGv7XwtQZ_sr5Nd2zZVe8gCdnEsNxp8awWsQX0d1IUJyY3XuxquTefiEYeaP7F7apWyjcn15WtDvWLds5_we3TWfo6V4ITMHqViGGV_YTZL8mFr7S77OLw7WNoZ8_Ljkgs-xsLHyOYfy-hh_RQo99C_vnB2Ejp3HgYL7ElFTZoCCDCI2J5zA')" }}></div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Sarah Smith</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Manager</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">24h / 40h</span>
                                            <span className="text-[10px] text-red-500">Under allocation</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1">
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800"></div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-blue-50/20 p-2 dark:border-slate-800 dark:bg-blue-900/5">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-purple-200 bg-purple-100 p-2 transition-shadow hover:shadow-md dark:border-purple-800 dark:bg-purple-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Malam</span></div>
                                                <p className="text-xs font-medium text-purple-900 dark:text-purple-100">00:00 - 08:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-purple-200 bg-purple-100 p-2 transition-shadow hover:shadow-md dark:border-purple-800 dark:bg-purple-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Malam</span></div>
                                                <p className="text-xs font-medium text-purple-900 dark:text-purple-100">00:00 - 08:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800">
                                            <div className="group flex cursor-pointer flex-col rounded-md border border-purple-200 bg-purple-100 p-2 transition-shadow hover:shadow-md dark:border-purple-800 dark:bg-purple-900/40">
                                                <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Malam</span></div>
                                                <p className="text-xs font-medium text-purple-900 dark:text-purple-100">00:00 - 08:00</p>
                                            </div>
                                        </div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 p-2 dark:border-slate-800"></div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-gray-50/50 p-2 dark:border-slate-800 dark:bg-gray-800/30"></div>
                                        <div className="min-h-[100px] min-w-[120px] flex-1 border-r border-slate-200 bg-gray-50/50 p-2 dark:border-slate-800 dark:bg-gray-800/30"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

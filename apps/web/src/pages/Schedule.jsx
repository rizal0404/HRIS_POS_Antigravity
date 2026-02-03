import React, { useState } from 'react';

export default function Schedule() {
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    // Generate week dates based on offset
    const getWeekDates = (offset) => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (offset * 7)); // Monday

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates(currentWeekOffset);
    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    // Mock schedule data
    const scheduleData = {
        // Format: 'YYYY-MM-DD': { shift: 'Pagi' | 'Siang' | 'Malam' | 'OFF', time: '07:00-15:00' }
    };

    // Generate mock data for the current week
    weekDates.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        if (index === 5 || index === 6) {
            scheduleData[dateStr] = { shift: 'OFF', time: null };
        } else if (index % 3 === 0) {
            scheduleData[dateStr] = { shift: 'Pagi', time: '07:00 - 15:00' };
        } else if (index % 3 === 1) {
            scheduleData[dateStr] = { shift: 'Siang', time: '15:00 - 23:00' };
        } else {
            scheduleData[dateStr] = { shift: 'Malam', time: '23:00 - 07:00' };
        }
    });

    const getShiftStyle = (shift) => {
        switch (shift) {
            case 'Pagi':
                return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
            case 'Siang':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'Malam':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            case 'OFF':
                return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';
            default:
                return 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200';
        }
    };

    const getShiftIcon = (shift) => {
        switch (shift) {
            case 'Pagi': return 'wb_sunny';
            case 'Siang': return 'wb_twilight';
            case 'Malam': return 'dark_mode';
            case 'OFF': return 'event_busy';
            default: return 'help';
        }
    };

    const formatMonthYear = () => {
        const firstDate = weekDates[0];
        const lastDate = weekDates[6];
        const options = { month: 'long', year: 'numeric' };

        if (firstDate.getMonth() === lastDate.getMonth()) {
            return firstDate.toLocaleDateString('id-ID', options);
        }
        return `${firstDate.toLocaleDateString('id-ID', { month: 'short' })} - ${lastDate.toLocaleDateString('id-ID', options)}`;
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 px-4 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-text-main-light dark:text-text-main-dark">Jadwal Shift</h1>
                </div>
            </header>

            <div className="p-4 space-y-4">
                {/* Week Navigation */}
                <div className="flex items-center justify-between bg-surface-light dark:bg-surface-dark rounded-xl p-3 shadow-sm">
                    <button
                        onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">chevron_left</span>
                    </button>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-text-main-light dark:text-text-main-dark">{formatMonthYear()}</p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            {currentWeekOffset === 0 ? 'Minggu Ini' : currentWeekOffset > 0 ? `+${currentWeekOffset} minggu` : `${currentWeekOffset} minggu`}
                        </p>
                    </div>
                    <button
                        onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">chevron_right</span>
                    </button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 text-xs">
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Pagi</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Siang</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Malam</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Libur</span>
                    </div>
                </div>

                {/* Schedule Cards */}
                <div className="space-y-3">
                    {weekDates.map((date, index) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const schedule = scheduleData[dateStr];
                        const today = isToday(date);

                        return (
                            <div
                                key={dateStr}
                                className={`bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm transition-all ${today ? 'ring-2 ring-primary' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Date */}
                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl ${today ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <span className={`text-xs font-medium ${today ? 'text-black/70' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                                            {dayNames[index]}
                                        </span>
                                        <span className={`text-xl font-bold ${today ? 'text-black' : 'text-text-main-light dark:text-text-main-dark'}`}>
                                            {date.getDate()}
                                        </span>
                                    </div>

                                    {/* Shift Info */}
                                    <div className="flex-1">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getShiftStyle(schedule?.shift)}`}>
                                            <span className="material-symbols-outlined text-lg">{getShiftIcon(schedule?.shift)}</span>
                                            <span className="font-medium">{schedule?.shift || '-'}</span>
                                        </div>
                                        {schedule?.time && (
                                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                                {schedule.time}
                                            </p>
                                        )}
                                    </div>

                                    {/* Today indicator */}
                                    {today && (
                                        <span className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                                            Hari Ini
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-3">Aksi Cepat</h3>
                    <div className="flex gap-3">
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
                            <span className="material-symbols-outlined">swap_horiz</span>
                            <span className="text-sm font-medium">Tukar Shift</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-secondary/10 text-secondary rounded-xl hover:bg-secondary/20 transition-colors">
                            <span className="material-symbols-outlined">event_note</span>
                            <span className="text-sm font-medium">Lihat Bulanan</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

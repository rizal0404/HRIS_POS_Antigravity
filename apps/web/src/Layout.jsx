import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';

export default function Layout() {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-main-light dark:text-text-main-dark transition-colors duration-200">
            <div className="flex-1 overflow-x-hidden pb-[100px]">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
}

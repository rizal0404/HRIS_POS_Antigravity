import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ManagerSidebar from './components/ManagerSidebar';

export default function ManagerLayout() {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white flex justify-center w-full">
            <div className="w-full h-full min-h-screen flex flex-col lg:flex-row bg-background-light dark:bg-background-dark overflow-hidden transition-all duration-300">

                {/* Sidebar - Desktop */}
                <ManagerSidebar />

                {/* Sidebar - Mobile Overlay NOT IMPLEMENTED YET - Keeping it simple for now, focusing on structure */}
                {/* If we needed mobile drawer, it would go here controlled by isMobileSidebarOpen */}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
                    <Outlet context={{ isMobileSidebarOpen, setIsMobileSidebarOpen }} />
                </div>
            </div>
        </div>
    );
}

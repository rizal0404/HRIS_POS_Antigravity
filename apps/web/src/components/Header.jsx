import React from 'react';

export default function Header() {
    return (
        <header className="flex items-center justify-between px-6 pt-8 pb-4 sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div
                        className="h-12 w-12 rounded-full bg-cover bg-center border-2 border-white dark:border-[#363517] shadow-sm"
                        role="img"
                        aria-label="Portrait of a smiling employee named Sarah"
                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB4jrjvLfGpoR5npMqK-NJJFiDIUedG4MXmFIr7sgubruXZnH96ss8HiiIz-wRCDWsjIAHXdBunjns01LjWGxhtgfNhXT-EQWKZ2uLogQvXiWVILPgd22HcUuh1KFfY5KDnXxYRorYcjK1K1rSctGX6du5JivATl1k4-5D7L5a7roQ1NXTMJQcj_vTAkDmtjtDToGePiC4BfXMB0HFqtxptY80omowtv8dEv7WpOLgC6QX-rdb1bHAv6sTPXEvHxhhAyWSSJih44Es")' }}
                    >
                    </div>
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-[#23220f]"></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-none mb-1">Selamat Pagi,</span>
                    <h2 className="text-xl font-bold leading-none">Sarah!</h2>
                </div>
            </div>
            <button className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-[#363517] shadow-sm hover:bg-neutral-50 transition-colors relative">
                <span className="material-symbols-outlined text-neutral-700 dark:text-white">notifications</span>
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-primary border border-white"></span>
            </button>
        </header>
    );
}

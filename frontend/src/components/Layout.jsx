import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Layout = ({ leftPanel, rightPanel, toolbar, children }) => {
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-300 overflow-hidden font-sans">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4 justify-between z-50">
                {toolbar}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar (Layers) */}
                <div
                    className={`border-r border-zinc-800 bg-zinc-900 flex flex-col z-40 transition-all duration-300 ease-in-out relative ${showLeft ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}
                >
                    <div className="w-64 h-full flex flex-col">
                        {leftPanel}
                    </div>
                </div>

                {/* Left Toggle Button */}
                <div className={`absolute top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${showLeft ? 'left-64' : 'left-0'}`}>
                    <button
                        onClick={() => setShowLeft(!showLeft)}
                        className="bg-zinc-900 border border-zinc-800 rounded-r-md py-4 pr-1 pl-0.5 text-zinc-500 hover:text-white hover:bg-zinc-800 shadow-sm flex items-center justify-center -ml-[1px]"
                        title={showLeft ? "Ocultar Painel" : "Mostrar Painel"}
                    >
                        {showLeft ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>

                {/* Canvas Area (Infinite Pan/Zoom Feel) */}
                <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center relative shadow-inner">
                    {/* Simplified Dot Grid Pattern - cleaner look */}
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(#a1a1aa 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    />

                    {/* The Content */}
                    {children}
                </div>

                {/* Right Toggle Button */}
                <div className={`absolute top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${showRight ? 'right-72' : 'right-0'}`}>
                    <button
                        onClick={() => setShowRight(!showRight)}
                        className="bg-zinc-900 border border-zinc-800 rounded-l-md py-4 pl-1 pr-0.5 text-zinc-500 hover:text-white hover:bg-zinc-800 shadow-sm flex items-center justify-center -mr-[1px]"
                        title={showRight ? "Ocultar Painel" : "Mostrar Painel"}
                    >
                        {showRight ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Right Sidebar (Inspector) */}
                <div
                    className={`border-l border-zinc-800 bg-zinc-900 flex flex-col z-40 transition-all duration-300 ease-in-out relative ${showRight ? 'w-72 translate-x-0' : 'w-0 translate-x-full opacity-0'}`}
                >
                    <div className="w-72 h-full flex flex-col">
                        {rightPanel}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;

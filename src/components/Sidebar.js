import React from 'react';
import { LayoutDashboard, Download, FileText, Settings } from 'lucide-react';

function Sidebar({ activeScreen, setActiveScreen }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'downloads', label: 'Downloads', icon: Download },
        { id: 'logs', label: 'Logs', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    return (
        <div className="w-64 h-screen bg-slate-900 text-white flex flex-col shadow-xl">
            {/* Header */}
            <div className="h-20 flex items-center border-b border-slate-800" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                <div className="flex items-center" style={{ gap: '12px' }}>
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">HomeStock</h1>
                        <p className="text-xs text-slate-500">v0.1.0</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {menuItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeScreen === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveScreen(item.id)}
                                className={`w-full h-11 flex items-center rounded-lg transition-all duration-200
                                    ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                style={{ paddingLeft: '16px', paddingRight: '16px', gap: '12px' }}
                            >
                                <Icon size={20} strokeWidth={2} className="flex-shrink-0" />
                                <span className="font-medium text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="h-16 flex items-center justify-center border-t border-slate-800">
                <p className="text-xs text-slate-500 font-medium">Stock Automation Tool</p>
            </div>
        </div>
    );
}

export default Sidebar;

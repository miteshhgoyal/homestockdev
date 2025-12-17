import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Activity,
    Clock,
    Download,
    Calendar,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Lightbulb,
    RefreshCw
} from 'lucide-react';

function Dashboard() {
    const [backendStatus, setBackendStatus] = useState('checking');
    const [isChecking, setIsChecking] = useState(false);
    const [stats, setStats] = useState({
        lastRun: 'Never',
        filesDownloaded: 0,
        nextScheduled: 'Not scheduled'
    });

    useEffect(() => {
        checkBackend();
    }, []);

    const checkBackend = async () => {
        setIsChecking(true);
        try {
            const response = await api.testConnection();
            setBackendStatus('connected');
        } catch (error) {
            setBackendStatus('disconnected');
        } finally {
            setIsChecking(false);
        }
    };

    const getStatusConfig = () => {
        switch (backendStatus) {
            case 'connected':
                return {
                    icon: CheckCircle2,
                    text: 'Connected',
                    color: 'text-emerald-600',
                    bgColor: 'bg-emerald-50',
                    borderColor: 'border-emerald-200',
                    iconBg: 'bg-emerald-100'
                };
            case 'disconnected':
                return {
                    icon: XCircle,
                    text: 'Disconnected',
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    iconBg: 'bg-red-100'
                };
            default:
                return {
                    icon: Activity,
                    text: 'Checking...',
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    borderColor: 'border-amber-200',
                    iconBg: 'bg-amber-100'
                };
        }
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900" style={{ marginBottom: '8px' }}>Dashboard</h1>
                        <p className="text-slate-600 flex items-center" style={{ gap: '8px' }}>
                            <TrendingUp size={16} />
                            Stock Automation Overview
                        </p>
                    </div>
                    <button
                        onClick={checkBackend}
                        disabled={isChecking}
                        className="flex items-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                    >
                        <RefreshCw size={16} className={`${isChecking ? 'animate-spin' : ''}`} />
                        <span className="font-medium text-slate-700">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Backend Status Card */}
            <div style={{ marginBottom: '32px' }}>
                <div className={`${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-xl shadow-sm transition-all`}
                    style={{ padding: '24px' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center" style={{ gap: '16px' }}>
                            <div className={`${statusConfig.iconBg} rounded-xl`} style={{ padding: '12px' }}>
                                <StatusIcon className={statusConfig.color} size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide" style={{ marginBottom: '4px' }}>
                                    Backend Status
                                </h3>
                                <p className={`text-2xl font-bold ${statusConfig.color}`}>
                                    {statusConfig.text}
                                </p>
                            </div>
                        </div>
                        {backendStatus === 'connected' && (
                            <div className="flex items-center bg-white rounded-lg border border-emerald-200"
                                style={{ gap: '8px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px' }}>
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-semibold text-emerald-700">Live</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px', marginBottom: '32px' }}>
                {/* Last Run Card */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-200 group"
                    style={{ padding: '24px' }}>
                    <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
                        <div className="bg-purple-100 rounded-xl group-hover:scale-110 transition-transform"
                            style={{ padding: '12px' }}>
                            <Clock className="text-purple-600" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Activity
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600" style={{ marginBottom: '8px' }}>Last Run</h3>
                    <p className="text-3xl font-bold text-slate-900">{stats.lastRun}</p>
                    <div className="border-t border-slate-100" style={{ marginTop: '16px', paddingTop: '16px' }}>
                        <p className="text-xs text-slate-500">Most recent execution</p>
                    </div>
                </div>

                {/* Files Downloaded Card */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-200 group"
                    style={{ padding: '24px' }}>
                    <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
                        <div className="bg-blue-100 rounded-xl group-hover:scale-110 transition-transform"
                            style={{ padding: '12px' }}>
                            <Download className="text-blue-600" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Total
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600" style={{ marginBottom: '8px' }}>Files Downloaded</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.filesDownloaded}</p>
                    <div className="border-t border-slate-100" style={{ marginTop: '16px', paddingTop: '16px' }}>
                        <p className="text-xs text-slate-500">Bhavcopy files archived</p>
                    </div>
                </div>

                {/* Next Scheduled Card */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-200 group"
                    style={{ padding: '24px' }}>
                    <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
                        <div className="bg-indigo-100 rounded-xl group-hover:scale-110 transition-transform"
                            style={{ padding: '12px' }}>
                            <Calendar className="text-indigo-600" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Upcoming
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600" style={{ marginBottom: '8px' }}>Next Scheduled</h3>
                    <p className="text-3xl font-bold text-slate-900">{stats.nextScheduled}</p>
                    <div className="border-t border-slate-100" style={{ marginTop: '16px', paddingTop: '16px' }}>
                        <p className="text-xs text-slate-500">Automated download time</p>
                    </div>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg border border-blue-400"
                style={{ padding: '24px' }}>
                <div className="flex items-start" style={{ gap: '16px' }}>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl flex-shrink-0" style={{ padding: '12px' }}>
                        <Lightbulb className="text-white" size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-white font-bold text-lg" style={{ marginBottom: '4px' }}>Quick Tip</h4>
                        <p className="text-blue-50 text-sm" style={{ lineHeight: '1.6' }}>
                            Navigate to the <strong className="text-white">Downloads</strong> section to start downloading NSE Bhavcopy files.
                            You can schedule automatic downloads or trigger them manually.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

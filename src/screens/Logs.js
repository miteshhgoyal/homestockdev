import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import {
    FileText,
    RefreshCw,
    Terminal,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info,
    AlertTriangle,
    Loader2,
    Download,
    Trash2,
    ArrowDown,
    ArrowUp
} from 'lucide-react';

function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterLevel, setFilterLevel] = useState('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortOrder, setSortOrder] = useState('newest');
    const logsEndRef = useRef(null);
    const logsContainerRef = useRef(null);

    // Wrap fetchLogs in useCallback to prevent infinite re-renders
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.getLogs();
            setLogs(response.data.logs);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            setLogs([`ERROR: Failed to fetch logs - ${error.message}`]);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array since api.getLogs is stable

    // Initial fetch on mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh every 3 seconds when enabled
    useEffect(() => {
        if (!autoRefresh) return;

        const intervalId = setInterval(() => {
            fetchLogs();
        }, 15000);

        return () => clearInterval(intervalId);
    }, [autoRefresh, fetchLogs]); // Added fetchLogs to dependencies

    // Auto-scroll when logs update
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, filterLevel, sortOrder, autoScroll]);

    const getLogLevel = (log) => {
        const logStr = log.toLowerCase();
        if (logStr.includes('error') || logStr.includes('failed')) return 'error';
        if (logStr.includes('warning') || logStr.includes('warn')) return 'warning';
        if (logStr.includes('success') || logStr.includes('completed')) return 'success';
        if (logStr.includes('info')) return 'info';
        return 'default';
    };

    const getLogIcon = (level) => {
        switch (level) {
            case 'error':
                return <XCircle size={14} className="text-red-400 shrink-0" />;
            case 'warning':
                return <AlertTriangle size={14} className="text-amber-400 shrink-0" />;
            case 'success':
                return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
            case 'info':
                return <Info size={14} className="text-blue-400 shrink-0" />;
            default:
                return <Terminal size={14} className="text-gray-400 shrink-0" />;
        }
    };

    const getLogColor = (level) => {
        switch (level) {
            case 'error':
                return 'text-red-400';
            case 'warning':
                return 'text-amber-400';
            case 'success':
                return 'text-emerald-400';
            case 'info':
                return 'text-blue-400';
            default:
                return 'text-gray-300';
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filterLevel === 'all') return true;
        return getLogLevel(log) === filterLevel;
    });

    // Always show newest first (reverse the array)
    const sortedLogs = sortOrder === 'newest'
        ? [...filteredLogs].reverse()
        : filteredLogs;

    const logStats = {
        total: logs.length,
        error: logs.filter(log => getLogLevel(log) === 'error').length,
        warning: logs.filter(log => getLogLevel(log) === 'warning').length,
        success: logs.filter(log => getLogLevel(log) === 'success').length
    };

    const exportLogs = () => {
        const logsText = logs.join('\n');
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homestock-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearLogs = () => {
        if (window.confirm('Are you sure you want to clear all logs?')) {
            setLogs([]);
        }
    };

    const scrollToBottom = () => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const scrollToTop = () => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900" style={{ marginBottom: '8px' }}>Logs</h1>
                        <p className="text-slate-600 flex items-center" style={{ gap: '8px' }}>
                            <FileText size={16} />
                            Application logs and activity history
                            {autoRefresh && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                    ● Auto-refreshing (15s)
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center" style={{ gap: '12px' }}>
                        <button
                            onClick={exportLogs}
                            disabled={logs.length === 0}
                            className="flex items-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                        >
                            <Download size={16} />
                            <span className="font-medium text-slate-700">Export</span>
                        </button>
                        <button
                            onClick={clearLogs}
                            disabled={logs.length === 0}
                            className="flex items-center bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-red-600"
                            style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                        >
                            <Trash2 size={16} />
                            <span className="font-medium">Clear</span>
                        </button>
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                            style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                        >
                            <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''}`} />
                            <span className="font-medium">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4" style={{ gap: '16px' }}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm" style={{ padding: '16px' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide" style={{ marginBottom: '4px' }}>Total Logs</p>
                                <p className="text-2xl font-bold text-slate-900">{logStats.total}</p>
                            </div>
                            <div className="bg-slate-100 rounded-lg" style={{ padding: '12px' }}>
                                <Terminal className="text-slate-600" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-red-200 shadow-sm" style={{ padding: '16px' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide" style={{ marginBottom: '4px' }}>Errors</p>
                                <p className="text-2xl font-bold text-red-600">{logStats.error}</p>
                            </div>
                            <div className="bg-red-100 rounded-lg" style={{ padding: '12px' }}>
                                <XCircle className="text-red-600" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm" style={{ padding: '16px' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide" style={{ marginBottom: '4px' }}>Warnings</p>
                                <p className="text-2xl font-bold text-amber-600">{logStats.warning}</p>
                            </div>
                            <div className="bg-amber-100 rounded-lg" style={{ padding: '12px' }}>
                                <AlertTriangle className="text-amber-600" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-emerald-200 shadow-sm" style={{ padding: '16px' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide" style={{ marginBottom: '4px' }}>Success</p>
                                <p className="text-2xl font-bold text-emerald-600">{logStats.success}</p>
                            </div>
                            <div className="bg-emerald-100 rounded-lg" style={{ padding: '12px' }}>
                                <CheckCircle2 className="text-emerald-600" size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs and Controls */}
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <div className="flex items-center" style={{ gap: '8px' }}>
                    {['all', 'error', 'warning', 'success', 'info'].map(level => (
                        <button
                            key={level}
                            onClick={() => setFilterLevel(level)}
                            className={`rounded-lg font-medium text-sm transition-all ${filterLevel === level
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                            {level !== 'all' && level !== 'info' && (
                                <span className={`rounded-full text-xs font-bold ${filterLevel === level ? 'bg-white/20' : 'bg-slate-100'
                                    }`} style={{ marginLeft: '8px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
                                    {logStats[level] || 0}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center" style={{ gap: '8px' }}>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm"
                        style={{ gap: '6px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
                    >
                        {sortOrder === 'newest' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                        {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </button>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`flex items-center rounded-lg transition-all font-medium text-sm ${autoScroll
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        style={{ gap: '6px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
                    >
                        Auto-scroll
                    </button>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center rounded-lg transition-all font-medium text-sm ${autoRefresh
                            ? 'bg-green-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        style={{ gap: '6px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
                    >
                        <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
                        Auto-refresh (15s)
                    </button>
                </div>
            </div>

            {/* Log Console */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
                <div className="bg-linear-to-r from-slate-800 to-slate-900 flex items-center justify-between border-b border-slate-700"
                    style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
                    <div className="flex items-center" style={{ gap: '12px' }}>
                        <div className="flex" style={{ gap: '8px' }}>
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="flex items-center text-slate-300" style={{ gap: '8px' }}>
                            <Terminal size={16} />
                            <span className="font-semibold text-sm">Console Output</span>
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-400" style={{ gap: '8px' }}>
                        <span className="font-mono">{sortedLogs.length} lines</span>
                    </div>
                </div>

                <div
                    ref={logsContainerRef}
                    className="bg-slate-950 text-gray-300 font-mono text-sm overflow-y-auto"
                    style={{ padding: '24px', height: '600px' }}
                >
                    {loading && logs.length === 0 ? (
                        <div className="flex items-center text-blue-400" style={{ gap: '12px' }}>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Loading logs...</span>
                        </div>
                    ) : sortedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                            <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p className="text-lg font-semibold">No logs available</p>
                            <p className="text-sm" style={{ marginTop: '8px' }}>Logs will appear here once generated</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div ref={logsEndRef}></div>
                            {sortedLogs.map((log, idx) => {
                                const level = getLogLevel(log);
                                const originalIndex = logs.length - idx;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-start rounded hover:bg-slate-900/50 transition-colors group"
                                        style={{ gap: '12px', paddingTop: '6px', paddingBottom: '6px', paddingLeft: '12px', paddingRight: '12px' }}
                                    >
                                        <span className="text-slate-600 font-semibold text-xs" style={{ marginTop: '2px', minWidth: '40px' }}>
                                            {String(originalIndex).padStart(3, '0')}
                                        </span>
                                        <div style={{ marginTop: '2px' }}>
                                            {getLogIcon(level)}
                                        </div>
                                        <span className={`${getLogColor(level)} break-all`} style={{ lineHeight: '1.6' }}>
                                            {log}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-linear-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg border border-slate-700" style={{ marginTop: '24px', padding: '24px' }}>
                <div className="flex items-start" style={{ gap: '16px' }}>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl shrink-0" style={{ padding: '12px' }}>
                        <Info className="text-blue-400" size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-white font-semibold" style={{ marginBottom: '8px' }}>Log Information</h4>
                        <ul className="text-slate-300 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <li className="flex items-center" style={{ gap: '8px' }}>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                Logs auto-refresh every 15 seconds when enabled
                            </li>
                            <li className="flex items-center" style={{ gap: '8px' }}>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                Use filters to view specific log types and toggle sort order
                            </li>
                            <li className="flex items-center" style={{ gap: '8px' }}>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                Auto-scroll keeps the latest logs visible automatically
                            </li>
                            <li className="flex items-center" style={{ gap: '8px' }}>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                Logs are flushed instantly to disk for real-time monitoring
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Logs;

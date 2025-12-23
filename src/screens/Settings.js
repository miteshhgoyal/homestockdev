import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Settings as SettingsIcon,
    FolderOpen,
    Clock,
    Power,
    Save,
    CheckCircle2,
    XCircle,
    Loader2,
    FolderInput,
    FolderOutput,
    Calendar,
    PlayCircle,
    PauseCircle,
    Info,
    AlertTriangle
} from 'lucide-react';


function Settings() {
    const [settings, setSettings] = useState({
        download_path: 'downloads',
        processed_path: 'processed',
        scheduler_time: '18:45',  // Updated default to 6:45 PM
        scheduler_enabled: false,
        scheduler_manual_date: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState(null);
    const [schedulerStatus, setSchedulerStatus] = useState(null);


    useEffect(() => {
        loadSettings();
        loadSchedulerStatus();
    }, []);


    useEffect(() => {
        if (originalSettings) {
            const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
            setHasChanges(changed);
        }
    }, [settings, originalSettings]);


    const loadSettings = async () => {
        try {
            const response = await api.getSettings();
            setSettings(response.data);
            setOriginalSettings(response.data);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        }
    };


    const loadSchedulerStatus = async () => {
        try {
            const response = await api.get('/api/scheduler/status');
            setSchedulerStatus(response.data);
        } catch (error) {
            console.error('Failed to load scheduler status:', error);
        }
    };


    const handleSave = async () => {
        setLoading(true);
        setMessage(null);


        try {
            const response = await api.saveSettings(settings);
            setOriginalSettings(settings);

            // Check for warning in response
            if (response.data.warning) {
                setMessage({
                    type: 'warning',
                    text: response.data.warning
                });
            } else {
                setMessage({
                    type: 'success',
                    text: 'Settings saved successfully!'
                });
            }

            // Reload scheduler status after save
            await loadSchedulerStatus();

            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };


    const handleSchedulerToggle = async () => {
        try {
            if (settings.scheduler_enabled) {
                await api.stopScheduler();
                setSettings({ ...settings, scheduler_enabled: false });
                setMessage({ type: 'success', text: 'Scheduler stopped successfully' });
            } else {
                await api.startScheduler();
                setSettings({ ...settings, scheduler_enabled: true });
                setMessage({ type: 'success', text: 'Scheduler started successfully' });
            }
            await loadSchedulerStatus();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to toggle scheduler' });
        }
    };


    const resetSettings = () => {
        if (window.confirm('Are you sure you want to reset to saved settings?')) {
            setSettings(originalSettings);
            setMessage({ type: 'success', text: 'Settings reset to last saved state' });
            setTimeout(() => setMessage(null), 3000);
        }
    };


    // Check if scheduler time is before 6:30 PM
    const isEarlySchedulerTime = () => {
        if (!settings.scheduler_time) return false;
        const [hour, minute] = settings.scheduler_time.split(':').map(Number);
        return hour < 18 || (hour === 18 && minute < 30);
    };


    const formatNextRunTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };


    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 className="text-4xl font-bold text-slate-900" style={{ marginBottom: '8px' }}>Settings</h1>
                <p className="text-slate-600 flex items-center" style={{ gap: '8px' }}>
                    <SettingsIcon size={16} />
                    Configure application preferences and automation
                </p>
            </div>


            <div className="max-w-3xl">
                {/* Main Settings Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-linear-to-r from-slate-800 to-slate-900 border-b border-slate-700"
                        style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
                        <div className="flex items-center" style={{ gap: '12px' }}>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg" style={{ padding: '8px' }}>
                                <SettingsIcon className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg">Application Configuration</h2>
                                <p className="text-slate-400 text-sm">Manage paths and scheduler settings</p>
                            </div>
                        </div>
                    </div>


                    {/* Settings Form */}
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* File Paths Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="flex items-center" style={{ gap: '8px', marginBottom: '16px' }}>
                                <FolderOpen size={18} className="text-slate-600" />
                                <h3 className="text-lg font-semibold text-slate-800">File Paths</h3>
                            </div>


                            {/* Download Path */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px' }}>
                                    <FolderInput size={16} className="text-blue-500" />
                                    Download Path
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={settings.download_path}
                                        onChange={(e) => setSettings({ ...settings, download_path: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm text-slate-700"
                                        style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                        placeholder="e.g., downloads"
                                    />
                                    <FolderInput size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400" style={{ left: '16px' }} />
                                </div>
                                <p className="text-xs text-slate-500" style={{ marginLeft: '4px' }}>
                                    Directory where downloaded files will be saved
                                </p>
                            </div>


                            {/* Processed Path */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px' }}>
                                    <FolderOutput size={16} className="text-purple-500" />
                                    Processed Path
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={settings.processed_path}
                                        onChange={(e) => setSettings({ ...settings, processed_path: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono text-sm text-slate-700"
                                        style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                        placeholder="e.g., processed"
                                    />
                                    <FolderOutput size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400" style={{ left: '16px' }} />
                                </div>
                                <p className="text-xs text-slate-500" style={{ marginLeft: '4px' }}>
                                    Directory for processed and archived files
                                </p>
                            </div>
                        </div>


                        {/* Divider */}
                        <div className="border-t border-slate-200"></div>


                        {/* Scheduler Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="flex items-center" style={{ gap: '8px', marginBottom: '16px' }}>
                                <Calendar size={18} className="text-slate-600" />
                                <h3 className="text-lg font-semibold text-slate-800">Automation Scheduler</h3>
                            </div>


                            {/* Scheduler Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px' }}>
                                    <Clock size={16} className="text-indigo-500" />
                                    Scheduled Time
                                </label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={settings.scheduler_time}
                                        onChange={(e) => setSettings({ ...settings, scheduler_time: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm text-slate-700"
                                        style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                    />
                                    <Clock size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400" style={{ left: '16px' }} />
                                </div>
                                <p className="text-xs text-slate-500" style={{ marginLeft: '4px' }}>
                                    Time to run automated downloads daily (24-hour format)
                                </p>

                                {/* Early Time Warning */}
                                {isEarlySchedulerTime() && (
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg" style={{ padding: '12px', marginTop: '8px' }}>
                                        <div className="flex items-start" style={{ gap: '8px' }}>
                                            <AlertTriangle size={16} className="text-amber-600 shrink-0" style={{ marginTop: '2px' }} />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800" style={{ marginBottom: '4px' }}>
                                                    Early Scheduler Time
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    NSE Bhavcopy data is typically available after 6:30 PM IST.
                                                    Consider setting the scheduler to 6:45 PM (18:45) or later for reliable downloads.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Manual Date Selection for Testing */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px' }}>
                                    <Calendar size={16} className="text-purple-500" />
                                    Manual Download Date (For Testing)
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={settings.scheduler_manual_date || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            scheduler_manual_date: e.target.value || null
                                        })}
                                        className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono text-sm text-slate-700"
                                        style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                    />
                                    <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400" style={{ left: '16px' }} />
                                    {settings.scheduler_manual_date && (
                                        <button
                                            onClick={() => setSettings({ ...settings, scheduler_manual_date: null })}
                                            className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600"
                                            style={{ right: '16px' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500" style={{ marginLeft: '4px' }}>
                                    {settings.scheduler_manual_date ? (
                                        <span className="text-purple-600 font-semibold">
                                            Testing Mode: Scheduler will download data for {new Date(settings.scheduler_manual_date).toLocaleDateString('en-IN')}
                                        </span>
                                    ) : (
                                        <span>Leave empty for normal operation (downloads today's data)</span>
                                    )}
                                </p>
                            </div>

                            {/* Scheduler Toggle */}
                            <div className={`bg-linear-to-br rounded-xl border-2 transition-all ${settings.scheduler_enabled
                                ? 'from-emerald-50 to-green-50 border-emerald-300'
                                : 'from-slate-50 to-gray-50 border-slate-200'
                                }`} style={{ padding: '24px' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start" style={{ gap: '16px' }}>
                                        <div className={`rounded-xl ${settings.scheduler_enabled ? 'bg-emerald-100' : 'bg-slate-200'
                                            }`} style={{ padding: '12px' }}>
                                            <Power
                                                className={settings.scheduler_enabled ? 'text-emerald-600' : 'text-slate-500'}
                                                size={24}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800" style={{ marginBottom: '4px' }}>
                                                Daily Scheduler Status
                                            </h4>
                                            <p className="text-sm text-slate-600" style={{ marginBottom: '8px' }}>
                                                Automatically download files at scheduled time
                                            </p>
                                            <div className="flex flex-col" style={{ gap: '6px' }}>
                                                <div className="flex items-center" style={{ gap: '8px' }}>
                                                    <span className={`inline-flex items-center rounded-full text-xs font-semibold ${settings.scheduler_enabled
                                                        ? 'bg-emerald-200 text-emerald-800'
                                                        : 'bg-slate-200 text-slate-700'
                                                        }`} style={{ gap: '6px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px' }}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${settings.scheduler_enabled ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'
                                                            }`}></div>
                                                        {settings.scheduler_enabled ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                {schedulerStatus && schedulerStatus.next_run && (
                                                    <span className="text-xs text-slate-600 font-medium">
                                                        Next run: {formatNextRunTime(schedulerStatus.next_run)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSchedulerToggle}
                                        className={`flex items-center rounded-xl font-semibold transition-all shadow-md hover:shadow-lg ${settings.scheduler_enabled
                                            ? 'bg-linear-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600'
                                            : 'bg-linear-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600'
                                            }`}
                                        style={{ gap: '8px', paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px' }}
                                    >
                                        {settings.scheduler_enabled ? (
                                            <>
                                                <PauseCircle size={18} />
                                                <span>Stop</span>
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircle size={18} />
                                                <span>Start</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Action Buttons */}
                        <div className="flex" style={{ gap: '12px', paddingTop: '16px' }}>
                            <button
                                onClick={handleSave}
                                disabled={loading || !hasChanges}
                                className="flex-1 flex items-center justify-center bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                                style={{ gap: '8px', paddingTop: '16px', paddingBottom: '16px' }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Save Settings</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={resetSettings}
                                disabled={loading || !hasChanges}
                                className="bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}
                            >
                                Reset
                            </button>
                        </div>


                        {/* Message Display */}
                        {message && (
                            <div className={`rounded-xl border-2 transition-all ${message.type === 'success'
                                ? 'bg-linear-to-br from-emerald-50 to-green-50 border-emerald-200'
                                : message.type === 'warning'
                                    ? 'bg-linear-to-br from-amber-50 to-yellow-50 border-amber-200'
                                    : 'bg-linear-to-br from-red-50 to-rose-50 border-red-200'
                                }`} style={{ padding: '16px' }}>
                                <div className="flex items-center" style={{ gap: '12px' }}>
                                    <div className={`rounded-lg ${message.type === 'success'
                                        ? 'bg-emerald-100'
                                        : message.type === 'warning'
                                            ? 'bg-amber-100'
                                            : 'bg-red-100'
                                        }`} style={{ padding: '8px' }}>
                                        {message.type === 'success' ? (
                                            <CheckCircle2 className="text-emerald-600" size={20} />
                                        ) : message.type === 'warning' ? (
                                            <AlertTriangle className="text-amber-600" size={20} />
                                        ) : (
                                            <XCircle className="text-red-600" size={20} />
                                        )}
                                    </div>
                                    <p className={`font-semibold ${message.type === 'success'
                                        ? 'text-emerald-800'
                                        : message.type === 'warning'
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}>
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Info Card */}
                <div className="bg-linear-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg border border-slate-700"
                    style={{ marginTop: '24px', padding: '24px' }}>
                    <div className="flex items-start" style={{ gap: '16px' }}>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl shrink-0" style={{ padding: '12px' }}>
                            <Info className="text-blue-400" size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-semibold" style={{ marginBottom: '8px' }}>Configuration Tips</h4>
                            <ul className="text-slate-300 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <li className="flex items-center" style={{ gap: '8px' }}>
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    File paths are relative to the application directory
                                </li>
                                <li className="flex items-center" style={{ gap: '8px' }}>
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    NSE Bhavcopy data is available after 6:30 PM IST daily
                                </li>
                                <li className="flex items-center" style={{ gap: '8px' }}>
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    Recommended scheduler time: 6:45 PM (18:45) or later
                                </li>
                                <li className="flex items-center" style={{ gap: '8px' }}>
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    Scheduler includes automatic retry if data is not ready
                                </li>
                                <li className="flex items-center" style={{ gap: '8px' }}>
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    Changes are applied immediately when scheduler settings are updated
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Settings;

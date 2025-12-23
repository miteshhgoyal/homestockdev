import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Download,
    Calendar,
    FileDown,
    CheckCircle2,
    AlertCircle,
    Loader2,
    TrendingDown,
    FileText,
    FolderOpen,
    File,
    Trash2,
    RefreshCw,
    Folder
} from 'lucide-react';

function Downloads() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [jobType, setJobType] = useState('NSE Bhavcopy');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [downloadedFiles, setDownloadedFiles] = useState([]);
    const [processedFiles, setProcessedFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [activeTab, setActiveTab] = useState('download'); // download, downloaded, processed

    const jobTypeOptions = [
        { value: 'NSE Bhavcopy', icon: TrendingDown, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { value: 'NSE Delivery', icon: FileDown, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { value: 'BSE Bhavcopy', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' }
    ];

    useEffect(() => {
        if (activeTab === 'downloaded' || activeTab === 'processed') {
            loadFiles();
        }
    }, [activeTab]);

    const loadFiles = async () => {
        setLoadingFiles(true);
        try {
            const [downloadedResponse, processedResponse] = await Promise.all([
                api.getDownloadedFiles(),
                api.getProcessedFiles()
            ]);
            setDownloadedFiles(downloadedResponse.data.files);
            setProcessedFiles(processedResponse.data.files);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDownload = async () => {
        if (!dateFrom || !dateTo) {
            setResult({
                type: 'error',
                message: 'Please select both start and end dates to continue'
            });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await api.startDownload({
                date_from: dateFrom,
                date_to: dateTo,
                job_type: jobType
            });

            setResult({
                type: 'success',
                message: response.data.message,
                details: response.data.details
            });

            // Refresh files list
            loadFiles();
        } catch (error) {
            setResult({
                type: 'error',
                message: error.response?.data?.detail || error.message || 'Failed to start download'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileDownload = async (filename, type) => {
        try {
            const response = await api.downloadFile(type, filename);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download file:', error);
            alert('Failed to download file');
        }
    };

    const handleFileDelete = async (filename, type) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }

        try {
            await api.deleteFile(type, filename);
            loadFiles();
        } catch (error) {
            console.error('Failed to delete file:', error);
            alert('Failed to delete file');
        }
    };

    const handleFileProcess = async (filename) => {
        try {
            setLoadingFiles(true);

            // Call the process API with just the filename
            const response = await api.processExcel(filename);

            // Show success message
            alert(`File Processed Successfully!\n\nOutput: ${response.data.output_file}\nRows Processed: ${response.data.rows_processed}\n\n${response.data.message}`);

            // Refresh files list
            await loadFiles();

            // Switch to processed files tab
            setActiveTab('processed');
        } catch (error) {
            console.error('Processing error:', error);
            const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
            alert(`Failed to process file:\n\n${errorMsg}`);
        } finally {
            setLoadingFiles(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const selectedJobType = jobTypeOptions.find(opt => opt.value === jobType);
    const SelectedIcon = selectedJobType?.icon || FileDown;

    const renderFilesList = (files, type) => {
        if (loadingFiles) {
            return (
                <div className="flex items-center justify-center" style={{ padding: '48px' }}>
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
            );
        }

        if (files.length === 0) {
            return (
                <div className="text-center" style={{ padding: '48px' }}>
                    <FolderOpen size={48} className="text-slate-300 mx-auto" style={{ marginBottom: '16px' }} />
                    <p className="text-slate-500 font-medium">No files found</p>
                    <p className="text-slate-400 text-sm" style={{ marginTop: '8px' }}>
                        {type === 'downloaded' ? 'Download some files to see them here' : 'Process files to see them here'}
                    </p>
                </div>
            );
        }

        return (
            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {files.map((file, idx) => (
                        <div
                            key={idx}
                            className="bg-white border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-all"
                            style={{ padding: '16px' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1" style={{ gap: '12px' }}>
                                    <div className="bg-blue-50 rounded-lg" style={{ padding: '10px' }}>
                                        <File size={20} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800 text-sm break-all">
                                            {file.name}
                                        </h4>
                                        <div className="flex items-center text-xs text-slate-500" style={{ gap: '12px', marginTop: '4px' }}>
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{formatDate(file.modified)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center" style={{ gap: '8px' }}>
                                    <button
                                        onClick={() => handleFileDownload(file.name, type)}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                        style={{ padding: '8px' }}
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    {/* Process Button - Only show for downloaded files */}
                                    {type === 'downloaded' && (
                                        <button
                                            onClick={() => handleFileProcess(file.name)}
                                            className="bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-all"
                                            style={{ padding: '8px' }}
                                            title="Process this file"
                                            disabled={loadingFiles}
                                        >
                                            <FileText size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleFileDelete(file.name, type)}
                                        className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                        style={{ padding: '8px' }}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 className="text-4xl font-bold text-slate-900" style={{ marginBottom: '8px' }}>
                    Downloads
                </h1>
                <p className="text-slate-600 flex items-center" style={{ gap: '8px' }}>
                    <Download size={16} />
                    Download and manage stock market data files
                </p>
            </div>

            <div className="max-w-4xl">
                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ marginBottom: '24px', padding: '8px' }}>
                    <div className="flex" style={{ gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('download')}
                            className={`flex-1 flex items-center justify-center rounded-xl font-semibold transition-all ${activeTab === 'download' ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            style={{ gap: '8px', paddingTop: '12px', paddingBottom: '12px' }}
                        >
                            <Download size={18} />
                            <span>New Download</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('downloaded')}
                            className={`flex-1 flex items-center justify-center rounded-xl font-semibold transition-all ${activeTab === 'downloaded' ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            style={{ gap: '8px', paddingTop: '12px', paddingBottom: '12px' }}
                        >
                            <Folder size={18} />
                            <span>Downloaded Files</span>
                            {downloadedFiles.length > 0 && (
                                <span className={`rounded-full text-xs font-bold ${activeTab === 'downloaded' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'}`} style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
                                    {downloadedFiles.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('processed')}
                            className={`flex-1 flex items-center justify-center rounded-xl font-semibold transition-all ${activeTab === 'processed' ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            style={{ gap: '8px', paddingTop: '12px', paddingBottom: '12px' }}
                        >
                            <FileText size={18} />
                            <span>Processed Files</span>
                            {processedFiles.length > 0 && (
                                <span className={`rounded-full text-xs font-bold ${activeTab === 'processed' ? 'bg-white text-blue-600' : 'bg-purple-100 text-purple-600'}`} style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px' }}>
                                    {processedFiles.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Download Tab Content */}
                {activeTab === 'download' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ padding: '32px' }}>
                        {/* Job Type Selection */}
                        <div style={{ marginBottom: '24px' }}>
                            <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                                <FileDown size={16} className="text-slate-500" />
                                Job Type
                            </label>
                            <div className="relative">
                                <select
                                    value={jobType}
                                    onChange={(e) => setJobType(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white font-medium text-slate-700 cursor-pointer hover:border-slate-300"
                                    style={{ paddingLeft: '48px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                >
                                    {jobTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.value}
                                        </option>
                                    ))}
                                </select>
                                <SelectedIcon size={18} className="absolute top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" style={{ left: '16px' }} />
                            </div>
                        </div>

                        {/* Date Range Selection */}
                        <div style={{ marginBottom: '24px' }}>
                            <label className="text-sm font-semibold text-slate-700 flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                                <Calendar size={16} className="text-slate-500" />
                                Date Range
                            </label>
                            <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                                <div>
                                    <label className="text-xs text-slate-600 font-medium" style={{ marginBottom: '6px', display: 'block' }}>
                                        From Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                                            style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                        />
                                        <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ left: '16px' }} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 font-medium" style={{ marginBottom: '6px', display: 'block' }}>
                                        To Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                                            style={{ paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
                                        />
                                        <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ left: '16px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={handleDownload}
                            disabled={loading || !dateFrom || !dateTo}
                            className="w-full bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center group"
                            style={{ paddingTop: '16px', paddingBottom: '16px', gap: '12px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={20} className="group-hover:animate-bounce" />
                                    <span>Start Download</span>
                                </>
                            )}
                        </button>

                        {/* Result Display */}
                        {result && (
                            <div className={`rounded-2xl shadow-lg border-2 transition-all ${result.type === 'success' ? 'bg-linear-to-br from-emerald-50 to-green-50 border-emerald-200' : 'bg-linear-to-br from-red-50 to-rose-50 border-red-200'}`} style={{ marginTop: '24px', padding: '24px' }}>
                                <div className="flex items-start" style={{ gap: '16px' }}>
                                    <div className={`rounded-xl shrink-0 ${result.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`} style={{ padding: '12px' }}>
                                        {result.type === 'success' ? (
                                            <CheckCircle2 className="text-emerald-600" size={24} strokeWidth={2.5} />
                                        ) : (
                                            <AlertCircle className="text-red-600" size={24} strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-lg ${result.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`} style={{ marginBottom: '8px' }}>
                                            {result.type === 'success' ? 'Download Successful' : 'Download Failed'}
                                        </h4>
                                        <p className={`text-sm font-medium ${result.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {result.message}
                                        </p>
                                        {result.details && result.details.length > 0 && (
                                            <ul className="text-xs font-mono" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {result.details.slice(0, 5).map((detail, idx) => (
                                                    <li key={idx} className="flex items-start" style={{ gap: '8px' }}>
                                                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${result.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ marginTop: '6px' }}></span>
                                                        <span className="font-mono text-xs">{detail}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Card */}
                        <div className="bg-linear-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg border border-slate-700" style={{ marginTop: '24px', padding: '24px' }}>
                            <div className="flex items-start" style={{ gap: '16px' }}>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl shrink-0" style={{ padding: '12px' }}>
                                    <AlertCircle className="text-blue-400" size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-semibold" style={{ marginBottom: '8px' }}>
                                        Download Information
                                    </h4>
                                    <ul className="text-slate-300 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <li className="flex items-center" style={{ gap: '8px' }}>
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                            Select a date range to download historical data
                                        </li>
                                        <li className="flex items-center" style={{ gap: '8px' }}>
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                            Files will be saved to your configured download directory
                                        </li>
                                        <li className="flex items-center" style={{ gap: '8px' }}>
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                            View downloaded files in the Downloaded Files tab
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Downloaded Files Tab Content */}
                {activeTab === 'downloaded' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ padding: '32px' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Downloaded Files</h3>
                                <p className="text-sm text-slate-600" style={{ marginTop: '4px' }}>
                                    {downloadedFiles.length} file{downloadedFiles.length !== 1 ? 's' : ''} in downloads directory
                                </p>
                            </div>
                            <button
                                onClick={loadFiles}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-semibold transition-all flex items-center"
                                style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                        {renderFilesList(downloadedFiles, 'downloaded')}
                    </div>
                )}

                {/* Processed Files Tab Content */}
                {activeTab === 'processed' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ padding: '32px' }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Processed Files</h3>
                                <p className="text-sm text-slate-600" style={{ marginTop: '4px' }}>
                                    {processedFiles.length} file{processedFiles.length !== 1 ? 's' : ''} in processed directory
                                </p>
                            </div>
                            <button
                                onClick={loadFiles}
                                className="bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl font-semibold transition-all flex items-center"
                                style={{ gap: '8px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                        {renderFilesList(processedFiles, 'processed')}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Downloads;

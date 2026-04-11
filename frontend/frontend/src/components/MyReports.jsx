import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { baseURL } from '../utils/constants';
import { AlertTriangle, CheckCircle, Clock, Loader2, ArrowLeft, Frown } from 'lucide-react';
import BackButton from './BackButton';
import { Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const MyReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const loggedInUser = localStorage.getItem('user');
    const guestDeviceId = localStorage.getItem('guestDeviceId');
    const userId = loggedInUser || guestDeviceId;
    const clientRef = useRef(null);

    useEffect(() => {
        if (userId) {
            fetchReports();
            setupWebSocket();
        } else {
            setLoading(false);
        }

        return () => {
            if (clientRef.current && clientRef.current.connected) {
                try {
                    clientRef.current.disconnect();
                } catch (e) {
                    console.error("Disconnect error", e);
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const fetchReports = async () => {
        try {
            const response = await axiosInstance.get(`${baseURL}/issues/user/${userId}`);
            // Sort by created date descending
            const sortedReports = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setReports(sortedReports);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const setupWebSocket = () => {
        if (!userId) return;

        const socketFactory = () => new SockJS(`${baseURL}/ws`);
        const client = Stomp.over(socketFactory);

        client.reconnect_delay = 5000;
        client.debug = () => { }; // Disable debug logs

        client.connect({}, () => {
            clientRef.current = client;

            client.subscribe(`/topic/issues/user/${userId}`, (payload) => {
                const updatedIssue = JSON.parse(payload.body);
                setReports(prevReports => {
                    const exists = prevReports.find(report => report.id === updatedIssue.id);
                    let newReports;
                    if (exists) {
                        // Update existing issue (like status change to RESOLVED)
                        newReports = prevReports.map(report =>
                            report.id === updatedIssue.id ? updatedIssue : report
                        );
                    } else {
                        // Add new reported issue
                        newReports = [updatedIssue, ...prevReports];
                    }
                    // Sort by created date descending
                    return newReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                });
            });
        }, (err) => {
            console.error("WebSocket Connection Error:", err);
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'RESOLVED': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'UNDER_REVIEW': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'IGNORED': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
            default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'; // PENDING
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'RESOLVED': return '🟢';
            case 'UNDER_REVIEW': return '🔵';
            case 'IGNORED': return '⚫';
            default: return '🟡'; // PENDING
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <BackButton />
            <div className="max-w-4xl mx-auto mt-6">

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-white/10 rounded-full">
                        <AlertTriangle className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {loggedInUser ? 'My Reported Issues' : 'Guest Reports'}
                        </h1>
                        <p className="text-gray-400">Track the status of issues you've reported.</p>
                    </div>
                </div>

                {reports.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-12 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500/50" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">No Reports Found</h2>
                        <p className="text-gray-400">You haven't reported any issues properly tracked yet.</p>
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4">Match ID</th>
                                        <th className="px-6 py-4">Issue Type</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => (
                                        <tr 
                                            key={report.id} 
                                            onClick={() => setSelectedReport(report)}
                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono font-medium text-white">{report.matchId}</td>
                                            <td className="px-6 py-4">{report.category || 'General'}</td>
                                            <td className={`px-6 py-4 font-semibold ${report.priority === 'High' ? 'text-red-400' : report.priority === 'Medium' ? 'text-orange-400' : 'text-blue-400'}`}>
                                                {report.priority || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 w-max ${getStatusColor(report.status)}`}>
                                                    {getStatusIcon(report.status)}
                                                    {report.status.charAt(0) + report.status.slice(1).toLowerCase().replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed View Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden pointer-events-auto">
                        <div className="bg-white/5 p-5 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">Issue Details</h3>
                            <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Match ID</p>
                                    <p className="font-mono text-sm text-white">{selectedReport.matchId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Category</p>
                                    <p className="font-medium text-white">{selectedReport.category || 'General'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                                    <p className={`font-bold ${selectedReport.priority === 'High' ? 'text-red-400' : selectedReport.priority === 'Medium' ? 'text-orange-400' : 'text-blue-400'}`}>
                                        {selectedReport.priority || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 w-max ${getStatusColor(selectedReport.status)}`}>
                                        {getStatusIcon(selectedReport.status)} {selectedReport.status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Description</h4>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-gray-200 text-sm leading-relaxed">
                                    {selectedReport.description}
                                </div>
                            </div>

                            {selectedReport.status === 'RESOLVED' && selectedReport.creatorResponse && (
                                <div>
                                    <h4 className="text-sm font-semibold text-green-400 mb-2">Creator Response</h4>
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-100 text-sm leading-relaxed">
                                        {selectedReport.creatorResponse}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-3">Timeline</h4>
                                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300/20 before:to-transparent">
                                    
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white/30 bg-slate-900 text-slate-500 group-[.is-active]:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                        </div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white/5 border border-white/10 p-3 rounded-lg shadow">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-white text-xs">Issue Reported</div>
                                                <time className="text-[10px] text-gray-500 font-mono">{new Date(selectedReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedReport.status === 'RESOLVED' && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white/30 bg-slate-900 text-slate-500 group-[.is-active]:text-green-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                            </div>
                                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-green-500/10 border border-green-500/20 p-3 rounded-lg shadow">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-bold text-white text-xs">Issue Resolved</div>
                                                    <time className="text-[10px] text-gray-500 font-mono">{new Date(selectedReport.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/80 p-4 border-t border-white/10 flex justify-between items-center">
                            <Link 
                                to={`/scorecard/${selectedReport.matchId}`}
                                className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-semibold transition-colors text-sm flex items-center gap-2"
                            >
                                View Match Scorecard &rarr;
                            </Link>
                            <button onClick={() => setSelectedReport(null)} className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default MyReports;

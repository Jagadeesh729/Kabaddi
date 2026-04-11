import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { X, CheckCircle, AlertTriangle, Loader2, Frown } from 'lucide-react';
import { baseURL } from '../utils/constants';
import toast from 'react-hot-toast';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

export const IssueManagementModal = ({ matchId, isOpen, onClose }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState({});

    const [selectedImage, setSelectedImage] = useState(null);
    const clientRef = useRef(null);

    useEffect(() => {
        if (isOpen && matchId) {
            fetchIssues();
            setupWebSocket();
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
    }, [isOpen, matchId]);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`/issues/match/${matchId}`);
            setIssues(response.data);
        } catch (error) {
            console.error("Failed to fetch issues:", error);
            toast.error("Failed to load issues.");
        } finally {
            setLoading(false);
        }
    };

    const setupWebSocket = () => {
        if (!matchId) return;

        const socketFactory = () => new SockJS(`${baseURL}/ws`);
        const client = Stomp.over(socketFactory);

        client.reconnect_delay = 5000;
        client.debug = () => { }; // Disable debug logs

        client.connect({}, () => {
            clientRef.current = client;

            client.subscribe(`/topic/issues/match/${matchId}`, (payload) => {
                const updatedIssue = JSON.parse(payload.body);
                setIssues(prevIssues => {
                    const exists = prevIssues.find(issue => issue.id === updatedIssue.id);
                    if (exists) {
                        return prevIssues.map(issue =>
                            issue.id === updatedIssue.id ? updatedIssue : issue
                        );
                    } else {
                        return [updatedIssue, ...prevIssues]; // newly reported issue
                    }
                });
            });
        }, (err) => {
            console.error("WebSocket Connection Error:", err);
        });
    };

    const handleResolve = async (issueId) => {
        try {
            const creatorResponse = responses[issueId] || "";
            await axiosInstance.put(`${baseURL}/issues/${issueId}/resolve`, { creatorResponse });
            toast.success("Issue resolved!");
            // The local list will be automatically updated by WebSocket if we remove the optimistic setup
            // Refresh local list optimistically as fallback:
            setIssues(prev => prev.map(issue =>
                issue.id === issueId && issue.status !== 'RESOLVED'
                    ? { ...issue, status: 'RESOLVED', creatorResponse, resolvedAt: new Date().toISOString() }
                    : issue
            ));
            // Clear response
            setResponses(prev => {
                const next = {...prev};
                delete next[issueId];
                return next;
            });
        } catch (error) {
            console.error("Resolution failed:", error);
            toast.error("Failed to resolve issue.");
        }
    };

    if (!isOpen) return null;

    const pendingIssues = issues.filter(i => i.status === 'PENDING');
    const resolvedIssues = issues.filter(i => i.status === 'RESOLVED');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-white font-bold text-lg">Manage Match Issues</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-3" />
                            <p className="text-gray-400">Loading issues...</p>
                        </div>
                    ) : (
                        <>
                            {/* Pending Issues */}
                            <section>
                                <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    Pending Issues ({pendingIssues.length})
                                </h4>

                                {pendingIssues.length === 0 ? (
                                    <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                        <CheckCircle className="w-10 h-10 text-green-500/50 mx-auto mb-2" />
                                        <p className="text-gray-400">No pending issues! Good job.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingIssues.map(issue => (
                                            <div key={issue.id} className="bg-white/5 border-l-4 border-red-500 rounded-r-xl p-4 flex flex-col md:flex-row justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-1 bg-white/10 rounded text-xs font-semibold text-gray-300">{issue.category || 'General'}</span>
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${issue.priority === 'High' ? 'bg-red-500/20 text-red-500' : issue.priority === 'Medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{issue.priority || 'N/A'}</span>
                                                    </div>
                                                    <p className="text-white font-medium mb-1">{issue.description}</p>
                                                    {issue.screenshot && (
                                                        <div className="mt-2 mb-2">
                                                            <img
                                                                src={(issue.screenshot?.startsWith('http') || issue.screenshot?.startsWith('data:')) ? issue.screenshot : `${baseURL}${issue.screenshot}`}
                                                                alt="Issue Screenshot"
                                                                className="h-24 w-auto rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                                                                onClick={() => setSelectedImage((issue.screenshot?.startsWith('http') || issue.screenshot?.startsWith('data:')) ? issue.screenshot : `${baseURL}${issue.screenshot}`)}
                                                            />
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-gray-500 mb-3">
                                                        Reported by <span className="text-gray-300">{issue.reporterName}</span> • {new Date(issue.createdAt).toLocaleString()}
                                                    </p>
                                                    <textarea 
                                                        placeholder="Enter response to reporter (optional)..."
                                                        value={responses[issue.id] || ''}
                                                        onChange={(e) => setResponses({...responses, [issue.id]: e.target.value})}
                                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
                                                        rows="2"
                                                    />
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <button
                                                        onClick={() => handleResolve(issue.id)}
                                                        className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap h-max"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Mark Resolved
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Resolved Issues */}
                            {resolvedIssues.length > 0 && (
                                <section className="pt-4 border-t border-white/5">
                                    <h4 className="text-green-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider opacity-70">
                                        <CheckCircle className="w-4 h-4" />
                                        Resolved Issues
                                    </h4>
                                    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                        {resolvedIssues.map(issue => (
                                            <div key={issue.id} className="bg-white/5 border border-white/5 rounded-lg p-3 flex justify-between items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-gray-400">{issue.category || 'General'}</span>
                                                        <span className="text-xs text-gray-500">• {issue.priority || 'N/A'} priority</span>
                                                    </div>
                                                    <p className="text-gray-300 text-sm line-through mb-1">{issue.description}</p>
                                                    {issue.creatorResponse && (
                                                        <p className="text-xs text-green-400/80 bg-green-500/10 p-2 rounded mb-1 border border-green-500/10 inline-block w-full">↳ {issue.creatorResponse}</p>
                                                    )}
                                                    <p className="text-xs text-gray-600">
                                                        {issue.reporterName} • {new Date(issue.createdAt).toLocaleDateString()}
                                                        {issue.resolvedAt && ` • Resolved: ${new Date(issue.resolvedAt).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded h-max shrink-0 mt-1">RESOLVED</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

            </div>

            {/* Image Lightbox Overlay */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] p-4">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-10 right-0 md:top-0 md:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Full size evidence"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image itself
                        />
                        <p className="text-center text-gray-400 mt-4 text-sm mt-4">
                            Click anywhere outside to close
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};



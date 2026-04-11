import React, { useState, useEffect, useRef } from 'react';
import { Send, BarChart2, MessageCircle, Mic, AlertCircle, Smile, Type, Bold, Italic, Underline, Strikethrough, X, Hand } from 'lucide-react';
import axios from 'axios';
import { baseURL } from '../utils/constants';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import toast from 'react-hot-toast';

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("FanZone Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400 text-sm">Fan Zone unavailable</p>
                    <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-xs text-white underline">Retry</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const FanZone = ({ match }) => {
    const [activeTab, setActiveTab] = useState('poll'); // 'poll' or 'chat'
    // const [votes, setVotes] = useState({ team1: 0, team2: 0 }); // Removed local state to rely on props for sync
    const [hasVoted, setHasVoted] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showConnectionSuccess, setShowConnectionSuccess] = useState(false); // New state for success message
    const [isSending, setIsSending] = useState(false); // New state to prevent double submission
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStylePicker, setShowStylePicker] = useState(false);
    const chatEndRef = useRef(null);
    const clientRef = useRef(null); // Ref to hold stomp client for cleanup

    // User Identification Logic
    const user = (() => {
        try {
            const stored = localStorage.getItem("user");
            if (stored && stored.trim().startsWith('{')) {
                const parsed = JSON.parse(stored);
                // Logged in user: Use accurate username
                return parsed.username || parsed.name || "User";
            }
            // Guest User: Check session storage for persistence, else generate new
            let guestId = sessionStorage.getItem("guestId");
            if (!guestId) {
                guestId = `Guest ${Math.floor(100 + Math.random() * 900)}`; // Range 100-999
                sessionStorage.setItem("guestId", guestId);
            }
            return guestId;
        } catch {
            let guestId = sessionStorage.getItem("guestId");
            if (!guestId) {
                guestId = `Guest ${Math.floor(100 + Math.random() * 900)}`;
                sessionStorage.setItem("guestId", guestId);
            }
            return guestId;
        }
    })();

    // Initial Load - Get Vote Data and Chat History
    useEffect(() => {
        if (match) {
            let isMounted = true;
            if (match && match.id) {
                // setVotes({
                //     team1: match.team1FanVotes || 0,
                //     team2: match.team2FanVotes || 0
                // });

                const localVote = localStorage.getItem(`voted_${match.id}`);
                const serverTotalVotes = (match.team1FanVotes || 0) + (match.team2FanVotes || 0);

                // Self-healing: If server has 0 votes but we have a local vote, it means DB was reset.
                // Allow user to vote again.
                if (localVote) {
                    if (serverTotalVotes > 0) {
                        setHasVoted(true);
                    } else {
                        localStorage.removeItem(`voted_${match.id}`);
                        setHasVoted(false);
                    }
                }

                // Fetch Chat History
                const fetchChatHistory = async () => {
                    try {
                        const response = await axios.get(`${baseURL}/chat/${match.id}/history`);
                        // Deduplicate history based on timestamp + sender + content signature if needed
                        // For now assuming backend returns unique list
                        if (isMounted) {
                            setMessages(response.data);
                            setTimeout(scrollToBottom, 100);
                        }
                    } catch (error) {
                        console.error("Failed to fetch chat history:", error);
                    }
                };
                fetchChatHistory();
            }
        }
    }, [match, match?.id, user]);

    // WebSocket Connection for Chat
    useEffect(() => {
        if (!match || !match.id) return;

        if (clientRef.current) return;

        // Fix: Use factory function for Stomp.over to prevent warning
        const socketFactory = () => new SockJS(`${baseURL}/ws`);
        const client = Stomp.over(socketFactory);

        client.reconnect_delay = 5000;
        client.debug = () => { }; // Disable debug logs

        client.connect({}, () => {
            setIsConnected(true);
            setShowConnectionSuccess(true);
            setTimeout(() => setShowConnectionSuccess(false), 3000);

            clientRef.current = client;

            client.subscribe(`/topic/chat/${match.id}`, (payload) => {
                const message = JSON.parse(payload.body);
                setMessages(prev => {
                    const isDuplicate = prev.some(m =>
                        (m.id && m.id === message.id) ||
                        (m.timestamp === message.timestamp && m.sender === message.sender && m.content === message.content)
                    );

                    if (isDuplicate) return prev;
                    return [...prev, message];
                });
                setTimeout(scrollToBottom, 100);
            });

        }, (err) => {
            console.error("WebSocket Connection Error:", err);
            setIsConnected(false);
        });

        setStompClient(client);

        return () => {
            if (client && client.connected) {
                try {
                    client.disconnect();
                } catch (e) {
                    console.error("Disconnect error", e);
                }
                clientRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [match?.id]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Optimistic Vote State
    const [localVotes, setLocalVotes] = useState({ team1: 0, team2: 0 });

    // Sync local votes with match props, but prevent regression (optimistic protection)
    useEffect(() => {
        if (match) {
            setLocalVotes(prev => ({
                team1: Math.max(prev.team1, match.team1FanVotes || 0),
                team2: Math.max(prev.team2, match.team2FanVotes || 0)
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [match?.team1FanVotes, match?.team2FanVotes]);

    const handleVote = async (team) => {
        if (hasVoted) {
            toast.error("You have already voted!");
            return;
        }
        if (isCompleted) {
            toast.error("Voting is closed for this match.");
            return;
        }

        // Optimistic Update
        setLocalVotes(prev => ({
            ...prev,
            [team]: prev[team] + 1
        }));

        localStorage.setItem(`voted_${match.id}`, team);
        setHasVoted(true);

        const teamName = team === 'team1' ? (match.team1?.name || match.team1Name || "Team A") : (match.team2?.name || match.team2Name || "Team B");

        // Premium Toast
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#1e293b] border border-blue-500/30 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center animate-pulse">
                                <Hand className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-bold text-white uppercase tracking-wide">
                                Vote Cast!
                            </p>
                            <p className="mt-1 text-sm text-gray-300">
                                You Voted for <span className="text-blue-400 font-bold">{teamName}</span>!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: 4000 });


        try {
            await axios.post(`${baseURL}/matches/vote/${match.id}?team=${team}`);
        } catch (error) {
            console.error("Vote failed:", error);
            // Rollback on failure could be added here, but usually overkill for polls
        }
    };

    const insertEmoji = (emoji) => {
        setNewMessage(prev => prev + emoji);
    };

    const applyStyle = (type, value) => {
        if (type === 'bold') setNewMessage(prev => prev + ' **bold** ');
        if (type === 'italic') setNewMessage(prev => prev + ' *italic* ');
        if (type === 'underline') setNewMessage(prev => prev + ' __underline__ ');
        if (type === 'strike') setNewMessage(prev => prev + ' ~~strike~~ ');
        if (type === 'color') setNewMessage(prev => prev + ` [${value}]text[/] `);
        setShowStylePicker(false);
    };

    const renderStyledMessage = (text) => {
        if (!text) return null;
        let parts = [{ type: 'text', content: text }];

        // Helper to process style
        const processStyle = (regex, type) => {
            parts = parts.flatMap(part => {
                if (part.type !== 'text') return part;
                const split = part.content.split(regex);
                return split.map((str, i) => {
                    if (i % 2 === 1) return { type, content: str };
                    return { type: 'text', content: str };
                });
            });
        };

        processStyle(/\*\*(.*?)\*\*/g, 'bold');
        processStyle(/\*(.*?)\*/g, 'italic');
        processStyle(/__(.*?)__/g, 'underline');
        processStyle(/~~(.*?)~~/g, 'strike');

        // Color [red] ... [/]
        parts = parts.flatMap(part => {
            if (part.type !== 'text') return part;
            const split = part.content.split(/\[(\w+)\](.*?)\[\/\]/g);
            let res = [];
            for (let i = 0; i < split.length; i++) {
                if (i % 3 === 0) {
                    if (split[i]) res.push({ type: 'text', content: split[i] });
                } else if (i % 3 === 1) {
                    const color = split[i];
                    const content = split[i + 1];
                    res.push({ type: 'color', color, content });
                    i++;
                }
            }
            return res;
        });

        return (
            <span>
                {parts.map((part, i) => {
                    if (part.type === 'text') return <span key={i}>{part.content}</span>;
                    if (part.type === 'bold') return <strong key={i} className="font-bold text-white tracking-wide">{part.content}</strong>;
                    if (part.type === 'italic') return <em key={i} className="italic text-gray-300">{part.content}</em>;
                    if (part.type === 'underline') return <u key={i} className="underline decoration-blue-400 decoration-2 underline-offset-2">{part.content}</u>;
                    if (part.type === 'strike') return <s key={i} className="line-through decoration-red-400/50">{part.content}</s>;
                    if (part.type === 'color') {
                        const colorClass =
                            part.color === 'red' ? 'text-red-400 font-bold' :
                                part.color === 'blue' ? 'text-blue-400 font-bold' :
                                    part.color === 'green' ? 'text-green-400 font-bold' :
                                        part.color === 'yellow' ? 'text-yellow-400 font-bold' : 'text-white';
                        return <span key={i} className={colorClass}>{part.content}</span>;
                    }
                    return null;
                })}
            </span>
        );
    };

    const sendMessage = (e) => {
        e.preventDefault();
        // Prevent if empty, no socket, disconnected, or ALREADY SENDING
        if (!newMessage.trim() || !stompClient || !isConnected || isSending) return;

        setIsSending(true); // Lock submission

        setShowEmojiPicker(false);
        setShowStylePicker(false);

        const chatMessage = {
            sender: user,
            content: newMessage,
            type: 'CHAT',
            matchId: match.id
        };

        try {
            stompClient.send(`/app/chat/${match.id}/sendMessage`, {}, JSON.stringify(chatMessage));
            setNewMessage('');
            // Add a timeout to unlock, just in case network is weird, but usually instant.
            // But ideally we unlock immediately after send returns (it's void).
            // We use timeout to debounce user clicking fast.
            setTimeout(() => setIsSending(false), 500);
        } catch (err) {
            console.error("Send failed", err);
            setIsSending(false);
        }
    };

    const isCompleted = match.status === 'COMPLETED';

    useEffect(() => {
        if (isCompleted && activeTab === 'chat') {
            setActiveTab('poll');
        }
    }, [isCompleted, activeTab]);

    if (!match) return null;

    if (!match) return null;

    const votes = localVotes; // Use optimistic state
    const totalVotes = votes.team1 + votes.team2;
    // Calculate percents based on optimistic local state
    const team1Percent = totalVotes === 0 ? 50 : Math.round((votes.team1 / totalVotes) * 100);
    const team2Percent = 100 - team1Percent;

    return (
        <ErrorBoundary>
            <div className="relative group mt-8">
                <div className="relative bg-[#0f172a] rounded-3xl border border-white/10 overflow-hidden h-[350px] md:h-[420px] max-w-4xl mx-auto flex flex-col">
                    {/* Header Tabs */}
                    <div className="flex border-b border-white/10 bg-black/20 shrink-0">
                        <button
                            onClick={() => setActiveTab('poll')}
                            className={`flex-1 p-4 text-center font-bold tracking-wide transition-colors flex items-center justify-center gap-2 ${activeTab === 'poll' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <BarChart2 className="w-4 h-4" /> {isCompleted ? 'Final Results' : 'Fan Poll'}
                        </button>
                        {!isCompleted && (
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 p-4 text-center font-bold tracking-wide transition-colors flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                <MessageCircle className="w-4 h-4" /> Live Chat
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {activeTab === 'poll' && (
                            <div className="p-6 h-full overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                <h3 className="text-white font-oswald text-xl mb-6 text-center">
                                    {isCompleted ? "Fan Predictions vs Result" : "Who will win? 🏆"}
                                </h3>

                                <div className="space-y-6">
                                    {/* Team 1 Bar */}
                                    <div
                                        onClick={() => handleVote('team1')}
                                        className={`group/bar relative z-10 transition-transform active:scale-95 duration-100 ${isCompleted ? 'cursor-default grayscale opacity-80' : hasVoted ? 'cursor-default opacity-90' : 'cursor-pointer hover:scale-[1.01]'}`}
                                    >
                                        <div className="flex justify-between text-sm mb-2 transition-transform duration-300">
                                            <span className="text-white font-bold">{match.team1?.name || match.team1Name || "Team A"}</span>
                                            <span className="text-orange-400 font-mono font-bold animate-pulse">{team1Percent}%</span>
                                        </div>
                                        <div
                                            className={`w-full bg-white/10 rounded-full h-12 relative overflow-hidden transition-all duration-300 shadow-md ${hasVoted ? '' : 'group-hover/bar:ring-2 group-hover/bar:ring-orange-500/50 group-hover/bar:shadow-lg group-hover/bar:shadow-orange-500/20'}`}
                                        >
                                            <div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000 ease-out"
                                                style={{ width: `${team1Percent}%` }}
                                            ></div>
                                            {(!hasVoted && !isCompleted) && (
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                                    <span className="flex items-center gap-2 text-white font-bold uppercase tracking-wider drop-shadow-md">
                                                        <Hand className="w-5 h-5 animate-bounce" /> Click to Vote
                                                    </span>
                                                </div>
                                            )}
                                            <span className={`absolute inset-0 flex items-center justify-center text-white font-bold uppercase tracking-wider z-10 drop-shadow-md transition-opacity duration-300 ${!hasVoted && !isCompleted ? 'group-hover/bar:opacity-0' : ''}`}>
                                                {isCompleted ? `${votes.team1} Votes` : (hasVoted ? `${votes.team1} Votes` : "Vote Team A")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* VS Divider */}
                                    <div className="text-center text-gray-500 text-xs font-bold uppercase tracking-[0.2em] py-2">
                                        VS
                                    </div>

                                    {/* Team 2 Bar */}
                                    <div
                                        onClick={() => handleVote('team2')}
                                        className={`group/bar relative z-10 transition-transform active:scale-95 duration-100 ${isCompleted ? 'cursor-default grayscale opacity-80' : hasVoted ? 'cursor-default opacity-90' : 'cursor-pointer hover:scale-[1.01]'}`}
                                    >
                                        <div className="flex justify-between text-sm mb-2 transition-transform duration-300">
                                            <span className="text-white font-bold">{match.team2?.name || match.team2Name || "Team B"}</span>
                                            <span className="text-blue-400 font-mono font-bold animate-pulse">{team2Percent}%</span>
                                        </div>
                                        <div
                                            className={`w-full bg-white/10 rounded-full h-12 relative overflow-hidden transition-all duration-300 shadow-md ${hasVoted ? '' : 'group-hover/bar:ring-2 group-hover/bar:ring-blue-500/50 group-hover/bar:shadow-lg group-hover/bar:shadow-blue-500/20'}`}
                                        >
                                            <div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-1000 ease-out"
                                                style={{ width: `${team2Percent}%` }}
                                            ></div>
                                            {(!hasVoted && !isCompleted) && (
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                                    <span className="flex items-center gap-2 text-white font-bold uppercase tracking-wider drop-shadow-md">
                                                        <Hand className="w-5 h-5 animate-bounce" /> Click to Vote
                                                    </span>
                                                </div>
                                            )}
                                            <span className={`absolute inset-0 flex items-center justify-center text-white font-bold uppercase tracking-wider z-10 drop-shadow-md transition-opacity duration-300 ${!hasVoted && !isCompleted ? 'group-hover/bar:opacity-0' : ''}`}>
                                                {isCompleted ? `${votes.team2} Votes` : (hasVoted ? `${votes.team2} Votes` : "Vote Team B")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                    <span className="bg-white/5 text-gray-400 text-xs px-4 py-1.5 rounded-full border border-white/10 shadow-sm font-mono tracking-widest uppercase">
                                        {totalVotes.toLocaleString()} Total Votes Cast
                                    </span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
                                {!isConnected && !showConnectionSuccess && (
                                    <div className="bg-yellow-500/20 text-yellow-200 text-xs p-1 text-center font-medium">
                                        Connecting to live chat...
                                    </div>
                                )}
                                {showConnectionSuccess && (
                                    <div className="bg-green-500/20 text-green-300 text-xs p-1 text-center font-medium animate-in fade-in slide-in-from-top-2 duration-500">
                                        Connected to Fan Zone!
                                    </div>
                                )}

                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                            <MessageCircle className="w-12 h-12 mb-2" />
                                            <p>Start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isMe = msg.sender === user;
                                            return (
                                                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-md ${isMe
                                                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-br-none'
                                                        : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/5'
                                                        }`}>
                                                        <div className={`font-bold text-[10px] uppercase tracking-wide mb-1 ${isMe ? 'text-orange-200' : 'text-gray-400'}`}>
                                                            {msg.sender}
                                                        </div>
                                                        {renderStyledMessage(msg.content)}
                                                    </div>
                                                    <span className="text-[10px] text-gray-600 mt-1 px-1">{msg.timestamp}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Professional Formatting Toolbar */}
                                {showStylePicker && (
                                    <div className="bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex flex-col gap-3 animate-in slide-in-from-bottom-2 shadow-2xl absolute bottom-16 right-4 w-64 z-30">
                                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Text Style</span>
                                            <button onClick={() => setShowStylePicker(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="flex justify-between gap-1">
                                            <button onClick={() => applyStyle('bold')} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white font-bold flex-1 flex justify-center" title="Bold"><Bold className="w-4 h-4" /></button>
                                            <button onClick={() => applyStyle('italic')} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white italic flex-1 flex justify-center" title="Italic"><Italic className="w-4 h-4" /></button>
                                            <button onClick={() => applyStyle('underline')} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white underline flex-1 flex justify-center" title="Underline"><Underline className="w-4 h-4" /></button>
                                            <button onClick={() => applyStyle('strike')} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white line-through flex-1 flex justify-center" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Highlight Color</span>
                                            <div className="flex justify-between gap-2">
                                                {['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange'].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => applyStyle('color', c)}
                                                        className={`w-6 h-6 rounded-full border-2 border-transparent hover:scale-110 hover:border-white transition-all shadow-sm ${c === 'red' ? 'bg-red-500' :
                                                            c === 'blue' ? 'bg-blue-500' :
                                                                c === 'green' ? 'bg-green-500' :
                                                                    c === 'yellow' ? 'bg-yellow-400' :
                                                                        c === 'purple' ? 'bg-purple-500' :
                                                                            c === 'pink' ? 'bg-pink-500' : 'bg-orange-500'
                                                            }`}
                                                        title={`${c} text`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Premium Emoji Picker */}
                                {showEmojiPicker && (
                                    <div className="absolute bottom-16 left-4 bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-30 w-72 animate-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fan Reactions</span>
                                            <button onClick={() => setShowEmojiPicker(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="h-56 overflow-y-auto custom-scrollbar pr-1">
                                            <div className="mb-3">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Sports & Action</span>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {['🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🥊', '🥋', '🥅', '🎯', '🎳', '🎮', '🎲', '🎰', '💪', '🦵', '🦶', '🏃', '🏋️', '🤸', '⛹️', '🤾', '🧗', '🚵'].map(emoji => (
                                                        <button key={emoji} onClick={() => insertEmoji(emoji)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-lg text-center">{emoji}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Hype & Emotions</span>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {['🔥', '💥', '💯', '✨', '⚡', '🌟', '💫', '🧨', '🎉', '🎊', '🎈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'].map(emoji => (
                                                        <button key={emoji} onClick={() => insertEmoji(emoji)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-lg text-center">{emoji}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Faces & Gestures</span>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', 'fw', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', 'unamused', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '👋', 'WY', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'].map(emoji => (
                                                        <button key={emoji} onClick={() => insertEmoji(emoji)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-lg text-center">{emoji}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Input Area */}
                                <form onSubmit={sendMessage} className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3 backdrop-blur-md">
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full bg-black/40 border border-white/10 rounded-full pl-5 pr-24 py-3.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-500 transition-all font-inter text-sm shadow-inner relative z-10"
                                        />

                                        {/* Integrated Tools in Input */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                                            <button
                                                type="button"
                                                onClick={() => { setShowStylePicker(!showStylePicker); setShowEmojiPicker(false); }}
                                                className={`p-2 rounded-full transition-all hover:scale-110 ${showStylePicker ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                title="Formatting"
                                            >
                                                <Type className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStylePicker(false); }}
                                                className={`p-2 rounded-full transition-all hover:scale-110 ${showEmojiPicker ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                title="Emojis"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || !isConnected || isSending}
                                        className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full text-white transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:grayscale hover:scale-110 active:scale-95 flex-shrink-0 border border-white/10 group"
                                    >
                                        <Send className="w-5 h-5 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default FanZone;

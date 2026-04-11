import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Shield, Medal, Flame, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { baseURL } from '../utils/constants';

const Leaderboard = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overall'); // 'overall', 'raiders', 'defenders'
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await axiosInstance.get(`${baseURL}/matchstats/leaderboard`);
                setLeaderboardData(response.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
                setError("Failed to load leaderboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const getSortedData = () => {
        switch (activeTab) {
            case 'raiders':
                return [...leaderboardData].sort((a, b) => b.totalRaidPoints - a.totalRaidPoints).filter(p => p.totalRaidPoints > 0);
            case 'defenders':
                return [...leaderboardData].sort((a, b) => b.totalTacklePoints - a.totalTacklePoints).filter(p => p.totalTacklePoints > 0);
            case 'overall':
            default:
                return [...leaderboardData].sort((a, b) => b.totalPoints - a.totalPoints).filter(p => p.totalPoints > 0);
        }
    };

    const sortedData = getSortedData();

    return (
        <div className="min-h-screen bg-slate-950 pb-20 pt-[80px]">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all self-start md:self-auto"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>

                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 mb-2"
                        >
                            <Trophy className="w-6 h-6 text-orange-400" />
                            <span className="text-orange-400 font-bold uppercase tracking-widest text-sm">Official Rankings</span>
                        </motion.div>
                        <h1 className="text-4xl md:text-5xl font-black italic bg-gradient-to-br from-white via-orange-100 to-orange-400 bg-clip-text text-transparent uppercase tracking-tight">
                            Global Leaderboard
                        </h1>
                    </div>

                    <div className="w-[100px] hidden md:block"></div> {/* Spacer for balancing */}
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="flex bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                        <button
                            onClick={() => setActiveTab('overall')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'overall'
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                        >
                            <Medal className="w-5 h-5" />
                            <span className="hidden sm:inline">Overall Points</span>
                            <span className="sm:hidden">Overall</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('raiders')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'raiders'
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                        >
                            <Target className="w-5 h-5" />
                            <span className="hidden sm:inline">Top Raiders</span>
                            <span className="sm:hidden">Raiders</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('defenders')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'defenders'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-700 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                        >
                            <Shield className="w-5 h-5" />
                            <span className="hidden sm:inline">Top Defenders</span>
                            <span className="sm:hidden">Defenders</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                            <p className="text-gray-400 font-medium">Crunching the numbers...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-400">
                            <p>{error}</p>
                        </div>
                    ) : sortedData.length === 0 ? (
                        <div className="text-center py-20">
                            <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-400 text-lg">No stats available yet. Complete some matches!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Table Header */}
                            <div className="hidden md:grid grid-cols-[80px_1fr_120px_120px_120px] gap-4 px-6 mb-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <div className="text-center">Rank</div>
                                <div>Player Name</div>
                                <div className="text-center">Raid Pts</div>
                                <div className="text-center">Tackle Pts</div>
                                <div className="text-center text-orange-400">Total</div>
                            </div>

                            {/* List Elements */}
                            <AnimatePresence mode="popLayout">
                                {sortedData.map((player, index) => {
                                    // Visual styling based on rank
                                    const isTop3 = index < 3;
                                    const getRankColor = (i) => {
                                        if (i === 0) return 'text-yellow-400 border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
                                        if (i === 1) return 'text-slate-300 border-slate-300 bg-slate-300/10 shadow-[0_0_12px_rgba(203,213,225,0.2)]';
                                        if (i === 2) return 'text-amber-600 border-amber-600 bg-amber-600/10 shadow-[0_0_10px_rgba(217,119,6,0.2)]';
                                        return 'text-gray-400 border-white/10 bg-white/5';
                                    };

                                    return (
                                        <motion.div
                                            key={player.playerId}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                            transition={{ delay: index * 0.05, duration: 0.3 }}
                                            onClick={() => navigate(`/player/${player.playerId}`)}
                                            className={`group cursor-pointer grid grid-cols-[auto_1fr] md:grid-cols-[80px_1fr_120px_120px_120px] gap-4 items-center p-4 md:px-6 md:py-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,165,0,0.15)] hover:border-orange-500/30 hover:bg-white/10 ${isTop3 ? 'bg-gradient-to-r from-orange-500/5 to-transparent backdrop-blur-lg border-white/10' : 'bg-white/5 backdrop-blur-lg border-transparent'}`}
                                        >
                                            {/* Rank Badge */}
                                            <div className="flex justify-center">
                                                <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl border font-black text-xl md:text-2xl ${getRankColor(index)}`}>
                                                    {isTop3 ? (
                                                        <div className="relative flex items-center justify-center">
                                                            <Medal className="w-8 h-8 md:w-10 md:h-10 opacity-30 absolute" />
                                                            <span className="relative z-10">{index + 1}</span>
                                                        </div>
                                                    ) : (
                                                        `#${index + 1}`
                                                    )}
                                                </div>
                                            </div>

                                            {/* Player Name */}
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h3 className={`font-black text-xl md:text-2xl tracking-wide font-oswald transition-colors group-hover:text-orange-400 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-500' : 'text-white'}`}>
                                                        {player.playerName}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Mobile Stats (Only visible on small screens) */}
                                            <div className="md:hidden col-span-2 grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5">
                                                <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                                    <span className="text-white font-bold">{player.totalRaidPoints}</span>
                                                </div>
                                                <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                                    <Shield className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                                                    <span className="text-white font-bold">{player.totalTacklePoints}</span>
                                                </div>
                                                <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                    <Trophy className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                                                    <span className="text-orange-400 font-black">{player.totalPoints}</span>
                                                </div>
                                            </div>

                                            {/* Desktop Stats (Hidden on mobile) */}
                                            <div className="hidden md:flex justify-center items-center">
                                                <span className={`text-lg font-bold ${activeTab === 'raiders' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-gray-400'}`}>
                                                    {player.totalRaidPoints}
                                                </span>
                                            </div>
                                            <div className="hidden md:flex justify-center items-center">
                                                <span className={`text-lg font-bold ${activeTab === 'defenders' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,212,238,0.5)]' : 'text-gray-400'}`}>
                                                    {player.totalTacklePoints}
                                                </span>
                                            </div>
                                            <div className="hidden md:flex justify-center items-center">
                                                <div className="px-4 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-xl w-full text-center">
                                                    {player.totalPoints}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

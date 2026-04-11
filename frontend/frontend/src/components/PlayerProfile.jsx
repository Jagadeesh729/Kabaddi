import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { baseURL } from '../utils/constants';
import BackButton from './BackButton';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Target, Shield, Calendar, MapPin,
    TrendingUp, ArrowUp, ArrowDown, Star, Zap, Award
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────
const deriveRole = (raid = 0, tackle = 0) => {
    const total = raid + tackle;
    if (total === 0) return { label: 'All-Rounder', icon: '⚡', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' };
    const ratio = raid / total;
    if (ratio >= 0.65) return { label: 'Raider', icon: '🗡️', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' };
    if (ratio <= 0.35) return { label: 'Defender', icon: '🛡️', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' };
    return { label: 'All-Rounder', icon: '⚡', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' };
};

const perfLabel = (pts) => {
    if (pts >= 15) return { label: 'EXCELLENT', cls: 'text-green-400 bg-green-500/20' };
    if (pts >= 10) return { label: 'GOOD',      cls: 'text-blue-400  bg-blue-500/20'  };
    if (pts >= 5)  return { label: 'AVERAGE',   cls: 'text-yellow-400 bg-yellow-500/20' };
    return              { label: 'POOR',        cls: 'text-red-400   bg-red-500/20'   };
};

// ── Custom Tooltip for Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-white/20 rounded-xl px-4 py-2 text-sm shadow-xl">
            <p className="text-gray-400 text-xs mb-1">{label}</p>
            <p className="font-bold text-orange-400">{payload[0].value} pts</p>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const PlayerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        const fetchPlayer = async () => {
            try {
                const [userRes, profileRes] = await Promise.all([
                    axiosInstance.get(`${baseURL}/users/user/${id}`),
                    axiosInstance.get(`${baseURL}/users/user/${id}/profile`),
                ]);

                const u = userRes.data;
                const p = profileRes.data;

                // Height conversion (cm → feet'inches)
                const heightStr = u.height
                    ? `${Math.floor(u.height / 30.48)}'${Math.round((u.height % 30.48) / 2.54)}"`
                    : 'N/A';

                // Fallback avatar using user's actual name
                const safeName = (u.name || 'Player').replace(/\s+/g, '+');
                const photo = u.url || `https://ui-avatars.com/api/?name=${safeName}&background=f97316&color=fff&size=256&bold=true`;

                const matches = (p.matches || []).slice(0, 10).map(m => {
                    const won = (m.team1Score ?? 0) > (m.team2Score ?? 0);
                    const pts = m.totalPoints ?? 0;
                    const perf = perfLabel(pts);
                    return {
                        date:         m.matchDate ? new Date(m.matchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
                        opponent:     m.oppositeTeamName || 'Unknown',
                        venue:        m.location || '—',
                        result:       won ? 'Won' : 'Lost',
                        score:        `${m.team1Score ?? 0}-${m.team2Score ?? 0}`,
                        totalPoints:  pts,
                        raidPoints:   m.raidPoints ?? 0,
                        tacklePoints: m.tacklePoints ?? 0,
                        perf,
                    };
                });

                const totalMatches = p.totalMatches ?? 0;
                const totalPoints  = p.totalPoints  ?? 0;
                const raidPoints   = p.raidPoints   ?? 0;
                const tacklePoints = p.tacklePoints ?? 0;

                setPlayer({
                    id:    u.id,
                    name:  u.name || 'Unknown Player',
                    photo,
                    about: u.about || '',
                    age:   u.age   || '—',
                    height: heightStr,
                    weight: u.weight ? `${u.weight} kg` : 'N/A',
                    hometown: u.location || '—',
                    debut: p.debutMatch
                        ? new Date(p.debutMatch).getFullYear().toString()
                        : 'N/A',
                    role: deriveRole(raidPoints, tacklePoints),
                    careerStats: {
                        totalMatches,
                        totalPoints,
                        raidPoints,
                        tacklePoints,
                        avgPoints: totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : '0.0',
                        raidPct:   totalPoints > 0  ? ((raidPoints / totalPoints) * 100).toFixed(0) : 0,
                    },
                    matches,
                });
            } catch (err) {
                console.error(err);
                setError('Failed to load player profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchPlayer();
    }, [id]);

    // Chart data — reverse so oldest → newest left to right
    const chartData = useMemo(
        () => [...(player?.matches ?? [])].reverse().map((m, i) => ({
            name:  m.date || `M${i + 1}`,
            opponent: m.opponent,
            points: m.totalPoints,
        })),
        [player]
    );

    const avgPoints = player
        ? parseFloat(player.careerStats.avgPoints)
        : 0;

    const personalBest = useMemo(
        () => player?.matches?.reduce((best, m) => (!best || m.totalPoints > best.totalPoints ? m : best), null),
        [player]
    );

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Loading Profile…</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !player) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center gap-4 text-center px-6">
                <Trophy className="w-16 h-16 text-gray-600" />
                <h2 className="text-2xl font-bold text-white">Profile Not Found</h2>
                <p className="text-gray-400">{error || 'This player profile could not be loaded.'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
            <BackButton />
            <div className="max-w-6xl mx-auto mt-4 space-y-6">

                {/* ── Page Title ── */}
                <motion.h1
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black uppercase italic text-center bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
                >
                    Player Profile
                </motion.h1>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* ── LEFT: Player Identity Card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="xl:col-span-1 space-y-4"
                    >
                        {/* Hero Card */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                            {/* Banner */}
                            <div className="h-28 bg-gradient-to-r from-orange-500 to-red-600 relative">
                                <div className="absolute inset-0 opacity-10"
                                    style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
                            </div>

                            {/* Avatar & Name */}
                            <div className="relative px-6 pb-6">
                                <div className="absolute -top-12 left-6">
                                    <img
                                        src={player.photo}
                                        alt={player.name}
                                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=f97316&color=fff&size=256&bold=true`; }}
                                        className="w-24 h-24 rounded-2xl border-4 border-slate-800 object-cover shadow-xl"
                                    />
                                </div>
                                <div className="pt-14">
                                    <h2 className="text-2xl font-black text-white leading-tight">{player.name}</h2>
                                    {player.about && <p className="text-orange-400 text-sm italic mt-0.5">"{player.about}"</p>}

                                    {/* Role badge */}
                                    <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold border ${player.role.color}`}>
                                        {player.role.icon} {player.role.label}
                                    </span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
                                {[
                                    { label: 'Age',    value: player.age },
                                    { label: 'Height', value: player.height },
                                    { label: 'Weight', value: player.weight },
                                    { label: 'Debut',  value: player.debut },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className="text-orange-400 text-xs font-bold uppercase tracking-wide">{label}</div>
                                        <div className="text-white text-sm font-semibold mt-0.5">{value}</div>
                                    </div>
                                ))}
                                <div className="col-span-2 bg-white/5 rounded-xl p-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                    <div>
                                        <div className="text-gray-400 text-xs font-bold uppercase tracking-wide">Hometown</div>
                                        <div className="text-white text-sm font-semibold">{player.hometown}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🏅 Personal Best Card */}
                        {personalBest && personalBest.totalPoints > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl border border-yellow-500/40 p-5 shadow-lg"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider">Personal Best</h3>
                                </div>
                                <div className="text-4xl font-black text-white mb-1">{personalBest.totalPoints} <span className="text-lg text-gray-400 font-normal">pts</span></div>
                                <p className="text-sm text-gray-300">vs {personalBest.opponent}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{personalBest.date} · {personalBest.venue}</p>
                                <div className="flex gap-3 mt-3">
                                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold">
                                        ⚡ {personalBest.raidPoints} Raid
                                    </span>
                                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-bold">
                                        🛡️ {personalBest.tacklePoints} Tackle
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* ── RIGHT: Stats + Chart + Recent Matches ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="xl:col-span-2 space-y-6"
                    >
                        {/* Career Stats Summary */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-6">
                            <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2 mb-5">
                                <TrendingUp className="w-5 h-5 text-green-400" /> Career Statistics
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                {[
                                    { label: 'Matches',   value: player.careerStats.totalMatches, color: 'text-blue-400',   grad: 'from-blue-500/20 to-purple-500/20' },
                                    { label: 'Total Pts', value: player.careerStats.totalPoints,  color: 'text-orange-400', grad: 'from-orange-500/20 to-red-500/20'   },
                                    { label: 'Avg / Match', value: player.careerStats.avgPoints, color: 'text-green-400',  grad: 'from-green-500/20 to-teal-500/20'  },
                                    { label: 'Raid %',    value: `${player.careerStats.raidPct}%`, color: 'text-yellow-400', grad: 'from-yellow-500/20 to-orange-500/20' },
                                ].map(({ label, value, color, grad }) => (
                                    <div key={label} className={`text-center p-4 bg-gradient-to-br ${grad} rounded-2xl`}>
                                        <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
                                        <div className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Raid Points',   value: player.careerStats.raidPoints,   icon: <Target className="w-4 h-4 text-red-400" />,  color: 'text-red-400'  },
                                    { label: 'Tackle Points', value: player.careerStats.tacklePoints, icon: <Shield className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
                                ].map(({ label, value, icon, color }) => (
                                    <div key={label} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                        <span className="text-gray-300 flex items-center gap-2">{icon} {label}</span>
                                        <span className={`${color} font-black text-lg`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 📈 Performance Trend Chart */}
                        {chartData.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2 mb-5">
                                    <Zap className="w-5 h-5 text-orange-400" /> Performance Trend
                                </h3>
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {avgPoints > 0 && (
                                                <ReferenceLine
                                                    y={avgPoints}
                                                    stroke="#f97316"
                                                    strokeDasharray="5 5"
                                                    strokeWidth={1.5}
                                                    label={{ value: 'Avg', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }}
                                                />
                                            )}
                                            <Line
                                                type="monotone"
                                                dataKey="points"
                                                stroke="#f97316"
                                                strokeWidth={3}
                                                dot={{ fill: '#f97316', strokeWidth: 0, r: 5 }}
                                                activeDot={{ r: 7, fill: '#ef4444', strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-gray-500 text-center mt-2">Points scored across last {chartData.length} match{chartData.length !== 1 ? 'es' : ''} — dashed line shows career average</p>
                            </div>
                        )}

                        {/* Recent Matches */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-6">
                            <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2 mb-5">
                                <Calendar className="w-5 h-5 text-blue-400" /> Recent Matches
                            </h3>

                            {player.matches.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No match history yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {player.matches.map((m, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className={`p-4 rounded-2xl border transition-colors ${
                                                    m.totalPoints === personalBest?.totalPoints
                                                        ? 'bg-yellow-500/10 border-yellow-500/30'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="text-gray-400 text-xs">{m.date}</span>
                                                        <span className="text-gray-600 text-xs">·</span>
                                                        <span className="text-gray-400 text-xs flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> {m.venue}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {m.totalPoints === personalBest?.totalPoints && (
                                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.perf.cls}`}>
                                                            {m.perf.label}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-white font-bold text-sm">vs {m.opponent}</span>
                                                        <span className={`text-sm font-bold flex items-center gap-1 ${m.result === 'Won' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {m.result === 'Won' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                            {m.result} {m.score}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { label: 'Total',  value: m.totalPoints,  cls: 'text-orange-400 bg-orange-500/10' },
                                                        { label: 'Raid',   value: m.raidPoints,   cls: 'text-red-400   bg-red-500/10'    },
                                                        { label: 'Tackle', value: m.tacklePoints, cls: 'text-cyan-400  bg-cyan-500/10'   },
                                                    ].map(({ label, value, cls }) => (
                                                        <div key={label} className={`text-center p-2.5 rounded-xl ${cls}`}>
                                                            <div className="text-xl font-black">{value}</div>
                                                            <div className="text-gray-400 text-xs">{label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Last-N Average Bar */}
                            {player.matches.length > 0 && (
                                <div className="mt-5 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-5 h-5 text-orange-400" />
                                            <span className="text-white font-semibold text-sm">Recent Form Average</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <div className="text-lg font-black text-orange-400">
                                                    {(player.matches.reduce((s, m) => s + m.totalPoints, 0) / player.matches.length).toFixed(1)}
                                                </div>
                                                <div className="text-xs text-gray-400">Pts/Match</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-black text-green-400">
                                                    {player.matches.filter(m => m.result === 'Won').length}/{player.matches.length}
                                                </div>
                                                <div className="text-xs text-gray-400">Wins</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
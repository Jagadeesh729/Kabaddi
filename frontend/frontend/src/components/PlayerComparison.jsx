import React, { useState, useMemo, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Shield, Zap, Swords, ChevronDown, Target, Users } from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getPlayerRole = (player) => {
    if (!player) return null;
    const { raidPoints = 0, tacklePoints = 0 } = player;
    const ratio = raidPoints / Math.max(raidPoints + tacklePoints, 1);
    if (ratio >= 0.65) return { label: 'Raider', icon: '🗡️', color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' };
    if (ratio <= 0.35) return { label: 'Defender', icon: '🛡️', color: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' };
    return { label: 'All-Rounder', icon: '⚡', color: 'text-purple-400 border-purple-400/40 bg-purple-400/10' };
};

const getContributionPct = (player, teamPlayers) => {
    if (!player || !teamPlayers?.length) return 0;
    const teamTotal = teamPlayers.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    return teamTotal > 0 ? Math.round(((player.totalPoints || 0) / teamTotal) * 100) : 0;
};

const metricWinner = (v1, v2) => {
    if (v1 > v2) return 'p1';
    if (v2 > v1) return 'p2';
    return 'tie';
};

// ── Animated Bar Row ──────────────────────────────────────────────────────────
const StatBarRow = ({ label, icon: Icon, v1, v2, color1 = '#f97316', color2 = '#ef4444' }) => {
    const max = Math.max(v1, v2, 1);
    const pct1 = (v1 / max) * 100;
    const pct2 = (v2 / max) * 100;
    const winner = metricWinner(v1, v2);

    return (
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* Left value + bar */}
            <div className="flex flex-col items-end gap-1">
                <span className={`text-xl font-black ${winner === 'p1' ? 'text-orange-400' : 'text-white/60'}`}>{v1}</span>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color1 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct1}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Label */}
            <div className="flex flex-col items-center gap-1 min-w-[90px] text-center">
                <Icon className="w-4 h-4 text-gray-400 mx-auto" />
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
                {winner === 'tie'
                    ? <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider bg-yellow-400/10 px-2 py-0.5 rounded-full">TIE</span>
                    : <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${winner === 'p1' ? 'text-orange-400 bg-orange-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        +{Math.abs(v1 - v2)} lead
                      </span>
                }
            </div>

            {/* Right bar + value */}
            <div className="flex flex-col items-start gap-1">
                <span className={`text-xl font-black ${winner === 'p2' ? 'text-red-400' : 'text-white/60'}`}>{v2}</span>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color2 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct2}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                    />
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const PlayerComparison = ({ isOpen, onClose, team1, team2 }) => {
    const [player1Id, setPlayer1Id] = useState('');
    const [player2Id, setPlayer2Id] = useState('');
    const [teamFilter, setTeamFilter] = useState('both');

    // Reset selections when modal closed
    useEffect(() => {
        if (!isOpen) { setPlayer1Id(''); setPlayer2Id(''); setTeamFilter('both'); }
    }, [isOpen]);

    const allPlayers = useMemo(() => {
        const t1 = team1?.players?.map(p => ({ ...p, teamName: team1.name, teamColor: '#f97316', teamKey: 'team1', teamPlayers: team1.players })) || [];
        const t2 = team2?.players?.map(p => ({ ...p, teamName: team2.name, teamColor: '#ef4444', teamKey: 'team2', teamPlayers: team2.players })) || [];
        return [...t1, ...t2];
    }, [team1, team2]);

    const filteredByTeam = useMemo(() => {
        if (teamFilter === 'team1') return allPlayers.filter(p => p.teamKey === 'team1');
        if (teamFilter === 'team2') return allPlayers.filter(p => p.teamKey === 'team2');
        return allPlayers;
    }, [allPlayers, teamFilter]);

    const player1 = allPlayers.find(p => p.id === player1Id);
    const player2 = allPlayers.find(p => p.id === player2Id);

    const contrib1 = getContributionPct(player1, player1?.teamPlayers);
    const contrib2 = getContributionPct(player2, player2?.teamPlayers);
    const role1 = getPlayerRole(player1);
    const role2 = getPlayerRole(player2);

    const chartData = useMemo(() => {
        if (!player1 || !player2) return [];
        const maxRaid   = Math.max(player1.raidPoints,   player2.raidPoints,   1);
        const maxTackle = Math.max(player1.tacklePoints, player2.tacklePoints, 1);
        const maxTotal  = Math.max(player1.totalPoints,  player2.totalPoints,  1);
        const maxContrib = Math.max(contrib1, contrib2, 1);
        return [
            { subject: 'Raid Pts',    A: player1.raidPoints,   B: player2.raidPoints,   fullMark: maxRaid   + 3 },
            { subject: 'Tackle Pts',  A: player1.tacklePoints, B: player2.tacklePoints, fullMark: maxTackle + 3 },
            { subject: 'Total Pts',   A: player1.totalPoints,  B: player2.totalPoints,  fullMark: maxTotal  + 5 },
            { subject: 'Team Contribution %', A: contrib1,    B: contrib2,             fullMark: maxContrib + 10 },
        ];
    }, [player1, player2, contrib1, contrib2]);

    // Verdict: count metric wins
    const metrics = player1 && player2 ? [
        metricWinner(player1.raidPoints,   player2.raidPoints),
        metricWinner(player1.tacklePoints, player2.tacklePoints),
        metricWinner(player1.totalPoints,  player2.totalPoints),
        metricWinner(contrib1,             contrib2),
    ] : [];
    const p1Wins = metrics.filter(m => m === 'p1').length;
    const p2Wins = metrics.filter(m => m === 'p2').length;
    const verdictPlayer = p1Wins > p2Wins ? player1 : p2Wins > p1Wins ? player2 : null;
    const verdictWins   = verdictPlayer === player1 ? p1Wins : p2Wins;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* ── Header ── */}
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 p-5 flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <Swords className="w-7 h-7 text-white" />
                            <h2 className="text-xl font-black italic uppercase text-white tracking-wider font-oswald">
                                FACE-OFF — Player Comparison
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5 overflow-y-auto space-y-5 flex-1">

                        {/* ── Team Filter ── */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Show players from:</span>
                            {[
                                { id: 'both', label: 'Both Teams' },
                                { id: 'team1', label: team1?.name || 'Team 1' },
                                { id: 'team2', label: team2?.name || 'Team 2' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setTeamFilter(opt.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        teamFilter === opt.id
                                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Player Selection ── */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-5 items-start">
                            {/* Player 1 */}
                            <PlayerCard
                                label="Player 1"
                                labelColor="text-orange-400"
                                borderColor="border-orange-500"
                                player={player1}
                                role={role1}
                                contrib={contrib1}
                                players={filteredByTeam.filter(p => p.id !== player2Id)}
                                value={player1Id}
                                onChange={setPlayer1Id}
                                accentClass="bg-orange-500/10 border-orange-500/20"
                                avatarClass="bg-orange-500"
                            />

                            {/* VS */}
                            <div className="flex justify-center items-center pt-10">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center font-black text-white/30 italic text-xl border border-white/10">
                                    VS
                                </div>
                            </div>

                            {/* Player 2 */}
                            <PlayerCard
                                label="Player 2"
                                labelColor="text-red-400"
                                borderColor="border-red-500"
                                player={player2}
                                role={role2}
                                contrib={contrib2}
                                players={filteredByTeam.filter(p => p.id !== player1Id)}
                                value={player2Id}
                                onChange={setPlayer2Id}
                                accentClass="bg-red-500/10 border-red-500/20"
                                avatarClass="bg-red-600"
                                alignRight
                            />
                        </div>

                        {/* ── Comparison Panel ── */}
                        {player1 && player2 && (
                            <motion.div
                                key={`${player1Id}-${player2Id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {/* Radar Chart */}
                                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                                    <div className="h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                                <PolarGrid stroke="#ffffff20" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                                <Radar name={player1.name} dataKey="A" stroke="#f97316" strokeWidth={2.5} fill="#f97316" fillOpacity={0.25} />
                                                <Radar name={player2.name} dataKey="B" stroke="#ef4444" strokeWidth={2.5} fill="#ef4444" fillOpacity={0.25} />
                                                <Legend
                                                    wrapperStyle={{ paddingTop: '10px' }}
                                                    formatter={(value, entry) => (
                                                        <span style={{ color: entry.color, fontWeight: 'bold', fontSize: '13px' }}>{value}</span>
                                                    )}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Animated Stat Bars */}
                                <div className="bg-white/5 rounded-3xl p-5 border border-white/10 space-y-5">
                                    <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center pb-2 border-b border-white/10">
                                        <span className="text-right font-bold text-orange-400 truncate text-sm">{player1.name}</span>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Metric</span>
                                        <span className="text-left font-bold text-red-400 truncate text-sm">{player2.name}</span>
                                    </div>
                                    <StatBarRow label="Raid Points"   icon={Zap}    v1={player1.raidPoints}   v2={player2.raidPoints} />
                                    <StatBarRow label="Tackle Points" icon={Shield}  v1={player1.tacklePoints} v2={player2.tacklePoints} />
                                    <StatBarRow label="Total Points"  icon={Trophy}  v1={player1.totalPoints}  v2={player2.totalPoints} />
                                    <StatBarRow label="Team Contribution %" icon={Target} v1={contrib1} v2={contrib2} />
                                </div>

                                {/* Verdict Banner */}
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className={`rounded-3xl p-5 border text-center ${
                                        verdictPlayer
                                            ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                                            : 'bg-white/5 border-white/10'
                                    }`}
                                >
                                    {verdictPlayer ? (
                                        <>
                                            <div className="text-3xl mb-1">🏆</div>
                                            <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">Duel Winner</p>
                                            <h3 className="text-2xl font-black text-white">
                                                {verdictPlayer.name} <span className="text-yellow-400">wins this duel!</span>
                                            </h3>
                                            <p className="text-gray-400 text-sm mt-2">
                                                {verdictWins} out of 4 metric{verdictWins !== 1 ? 's' : ''} advantage
                                                {' '}({verdictPlayer.teamName})
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-3xl mb-1">🤝</div>
                                            <h3 className="text-xl font-black text-white">It's a Tie!</h3>
                                            <p className="text-gray-400 text-sm mt-1">Both players are evenly matched across all metrics.</p>
                                        </>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Empty State */}
                        {(!player1 || !player2) && (
                            <div className="h-[200px] flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-3xl">
                                <Swords className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm">Select two players to begin the comparison</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Player Card Sub-component ─────────────────────────────────────────────────
const PlayerCard = ({ label, labelColor, player, role, contrib, players, value, onChange, accentClass, avatarClass, alignRight }) => (
    <div className="space-y-3">
        <label className={`text-xs font-bold ${labelColor} uppercase tracking-widest block ${alignRight ? 'text-center md:text-right' : 'text-center md:text-left'}`}>
            {label}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-orange-500 transition-colors appearance-none"
            >
                <option value="">Select Player</option>
                {players.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.name} ({p.teamName})
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <AnimatePresence>
            {player && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`p-4 rounded-2xl border text-center ${accentClass}`}
                >
                    <div className={`w-14 h-14 mx-auto ${avatarClass} rounded-full flex items-center justify-center text-2xl font-black text-white mb-2 shadow-lg`}>
                        {player.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-white text-base leading-tight">{player.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{player.teamName}</p>

                    {/* Role Badge */}
                    {role && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${role.color}`}>
                            {role.icon} {role.label}
                        </span>
                    )}

                    {/* Contribution */}
                    <div className="mt-2 text-[11px] text-gray-400">
                        Team contribution: <span className="font-bold text-white">{contrib}%</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

export default PlayerComparison;

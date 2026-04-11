import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { Trophy, Clock, MapPin, Flame, Users, Target, Shield, Star, MessageSquare, Download, FileText, Gamepad2, Medal, Share2, Sparkles } from 'lucide-react';
import { Stomp } from '@stomp/stompjs';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { baseURL } from '../utils/constants';
import BackButton from './BackButton';
import FanZone from './FanZone';
import webSocketService from '../service/websocket';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import ReportIssueModal from './ReportIssueModal';

import { IssueManagementModal } from './IssueManagementModal';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import VSLoadingScreen from './VSLoadingScreen';
import CountUp from 'react-countup';
import PlayerComparison from './PlayerComparison';
import AIMatchAssistantModal from './AIMatchAssistantModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MatchSubscriptionModal from './MatchSubscriptionModal';
import { Bell } from 'lucide-react';

const ScoreCard = () => {
  const [selectedTeam, setSelectedTeam] = useState('team1'); // For player stats
  const [selectedTab, setSelectedTab] = useState('stats'); // New state for tabs: 'stats' or 'commentary'
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [matchName, setMatchName] = useState('');
  const [commentaries, setCommentaries] = useState([]);
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);
  const [isPopped, setIsPopped] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [pendingIssueCount, setPendingIssueCount] = useState(0);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [liveViewers, setLiveViewers] = useState(0);

  // New state for In-Session Issue Notification
  const [activeNotification, setActiveNotification] = useState(null);

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored.trim().startsWith('{')) {
        const parsed = JSON.parse(stored);
        return parsed.username || parsed.name || stored;
      }
      return null;
    } catch {
      const raw = localStorage.getItem("user");
      return (raw && raw !== "Guest" && raw !== "guest") ? raw : null;
    }
  })();

  const isCreator = match && currentUser && match.createdBy === currentUser;


  const score = match?.score || 0;

  // MVP Calculation
  const mvp = (() => {
    if (!match || match.status !== 'COMPLETED') return null;
    const team1Players = (match.team1?.players || []).map(p => ({ ...p, teamName: match.team1.name, teamPhoto: match.team1.photo }));
    const team2Players = (match.team2?.players || []).map(p => ({ ...p, teamName: match.team2.name, teamPhoto: match.team2.photo }));
    const allPlayers = [...team1Players, ...team2Players];
    if (allPlayers.length === 0) return null;

    return allPlayers.reduce((prev, current) => {
      return (prev.totalPoints > current.totalPoints) ? prev : current;
    }, allPlayers[0]);
  })();

  // Dynamic Match Flow Data Generator
  const matchFlowData = React.useMemo(() => {
    if (!match) return [];
    const flowData = [{ time: "Start", team1: 0, team2: 0, event: "Match Started" }];
    
    if (commentaries && commentaries.length > 0) {
      const validCommentaries = [...commentaries].reverse();
        
      validCommentaries.forEach((c) => {
        flowData.push({
          time: new Date(c.dateAndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          team1: c.team1Score || 0,
          team2: c.team2Score || 0,
          event: c.commentary,
        });
      });
    }

    if (match.status === 'LIVE' || match.status === 'PAUSED') {
       flowData.push({
         time: "Current",
         team1: match.team1?.score || 0,
         team2: match.team2?.score || 0,
         event: match.status === 'PAUSED' ? "Match Paused" : "Current Score"
       });
    } else if (match.status === 'COMPLETED' && flowData.length > 1) {
       flowData.push({
         time: "Final",
         team1: match.team1?.score || 0,
         team2: match.team2?.score || 0,
         event: "Full Time"
       });
    }
    
    return flowData;
  }, [commentaries, match]);

  useEffect(() => {
    if (matchId && isCreator) {
      const fetchPendingIssues = async () => {
        try {
          const response = await axiosInstance.get(`/issues/match/${matchId}`);
          const pending = response.data.filter(i => i.status === 'PENDING').length;
          setPendingIssueCount(pending);
        } catch (error) {
          console.error("Failed to fetch pending issues count", error);
        }
      };

      fetchPendingIssues();
      // Poll every 30 seconds for updates
      const interval = setInterval(fetchPendingIssues, 30000);
      return () => clearInterval(interval);
    }
  }, [matchId, isCreator]);

  useEffect(() => {
    if (score > 0) {
      setIsPopped(true);
      const timer = setTimeout(() => {
        setIsPopped(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [score]);

  const formatTimeFromSeconds = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      return "00:00";
    }

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = Math.floor(totalSeconds % 60);

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const manageCountdownTimer = useCallback((currentStatus, currentRemainingDuration) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (currentStatus === 'LIVE' && currentRemainingDuration > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setMatch(prev => ({ ...prev, status: 'COMPLETED', remainingDuration: 0, time: "00:00" }));
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, []);

  const transformPlayers = useCallback((players) => {
    return players.map(p => ({
      id: p.playerId,
      name: p.playerName,
      raidPoints: p.raidPoints,
      tacklePoints: p.tacklePoints,
      totalPoints: p.raidPoints + p.tacklePoints,
    }));
  }, []);

  const fetchMatchData = useCallback(async () => {
    const id = matchId;
    const startTime = Date.now();

    try {
      setLoading(true);
      const response = await axiosInstance.get(`/matchstats/match/scorecard/${id}`);
      const apiData = response.data;

      const transformedData = {
        id: apiData.matchId,
        matchName: apiData.matchName || "Kabaddi Match",
        team1: {
          name: apiData.team1Name,
          photo: apiData.team1PhotoUrl || `https://ui-avatars.com/api/?name=${apiData.team1Name.split(' ').join('+')}&background=random`,
          score: apiData.team1Score,

          players: transformPlayers(apiData.team1),
        },
        team1FanVotes: apiData.team1FanVotes,
        team2FanVotes: apiData.team2FanVotes,
        team2: {
          name: apiData.team2Name,
          photo: apiData.team2PhotoUrl || `https://ui-avatars.com/api/?name=${apiData.team2Name.split(' ').join('+')}&background=random`,
          score: apiData.team2Score,
          players: transformPlayers(apiData.team2),
        },
        liveCommentary: apiData.liveCommentary || "",
        matchSummary: apiData.matchSummary || null,
        status: apiData.status,
        time: formatTimeFromSeconds(apiData.remainingDuration) || "00:00",
        remainingDuration: apiData.remainingDuration,
        venue: apiData.location || "Kabaddi Stadium",
        date: apiData.createdAt || new Date().toISOString(),
        scheduledStartTime: apiData.scheduledStartTime,
        totalViews: apiData.totalViews || 0,
        creatorName: apiData.creatorName || "Unknown",
      };

      setMatch(transformedData);
      setMatchName(transformedData.matchName);
      setRemainingTime(transformedData.remainingDuration);
      setLiveViewers(apiData.liveViewers || 0);

      manageCountdownTimer(transformedData.status, transformedData.remainingDuration);

      // Increment views
      axiosInstance.post(`/matches/${matchId}/view`).catch(err => console.error("Failed to increment views", err));

    } catch (err) {
      setError("Failed to fetch match scorecard.");
      console.error(err);
    } finally {
      // Enforce minimum cinematic duration (4.5 seconds for the full intro sequence)
      const elapsed = Date.now() - startTime;
      const minDuration = 4500;
      const remaining = minDuration - elapsed;
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining));
      }
      setLoading(false);
    }
  }, [matchId, manageCountdownTimer, transformPlayers]);

  const fetchCommentaryData = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/commentary/match/${matchId}`);
      setCommentaries(response.data);
    } catch (err) {
      console.error("Failed to fetch commentaries:", err);
    }
  }, [matchId]);

  const handleExport = async (type) => {
    try {
      toast.loading(`Exporting ${type === 'excel' ? 'Excel' : 'PDF'}...`);
      const response = await axiosInstance.get(`/matches/export/${type}/${matchId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `match-${matchId}.${type === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss();
      toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} downloaded successfully`);
    } catch (err) {
      console.error("Export failed", err);
      toast.dismiss();
      toast.error("Failed to export match data");
    }
  };

  useEffect(() => {
    fetchMatchData();
    fetchCommentaryData();

    const matchTopic = `/topic/matches/${matchId}`;
    // Corrected topic to match backend's likely format: `/topic/matches/commentary{matchId}`
    const commentaryTopic = `/topic/matches/commentary${matchId}`;

    webSocketService.connect(() => {
      webSocketService.subscribe(matchTopic, (updatedScoreCardDto) => {
        // console.log('Received real-time ScoreCard update (WebSocket):', updatedScoreCardDto);

        setMatch(prevMatch => {
          if (!prevMatch) return null;

          if (updatedScoreCardDto.status === 'COMPLETED' && prevMatch.status !== 'COMPLETED') {
            // Trigger confetti explosion
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              // since particles fall down, start a bit higher than random
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            toast.success("Match Completed!", {
              icon: '🏆',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
            });
          }

          const newMatch = {
            ...prevMatch,
            id: updatedScoreCardDto.matchId || prevMatch.id,
            matchName: updatedScoreCardDto.matchName || prevMatch.matchName,
            status: updatedScoreCardDto.status,
            remainingDuration: updatedScoreCardDto.remainingDuration,
            time: formatTimeFromSeconds(updatedScoreCardDto.remainingDuration),
            venue: updatedScoreCardDto.location || prevMatch.venue,
            date: updatedScoreCardDto.createdAt || prevMatch.date,
            creatorName: updatedScoreCardDto.creatorName || prevMatch.creatorName, // Update creatorName
            liveCommentary: updatedScoreCardDto.liveCommentary || prevMatch.liveCommentary,
            matchSummary: updatedScoreCardDto.matchSummary !== undefined ? updatedScoreCardDto.matchSummary : prevMatch.matchSummary,
            team1: {
              ...prevMatch.team1,
              name: updatedScoreCardDto.team1Name || prevMatch.team1.name,
              score: updatedScoreCardDto.team1Score !== undefined ? updatedScoreCardDto.team1Score : prevMatch.team1.score,
              players: updatedScoreCardDto.team1 ? transformPlayers(updatedScoreCardDto.team1) : prevMatch.team1.players,
            },
            team2: {
              ...prevMatch.team2,
              name: updatedScoreCardDto.team2Name || prevMatch.team2.name,
              score: updatedScoreCardDto.team2Score !== undefined ? updatedScoreCardDto.team2Score : prevMatch.team2.score,
              players: updatedScoreCardDto.team2 ? transformPlayers(updatedScoreCardDto.team2) : prevMatch.team2.players,
            },
            team1FanVotes: updatedScoreCardDto.team1FanVotes || prevMatch.team1FanVotes,
            team2FanVotes: updatedScoreCardDto.team2FanVotes || prevMatch.team2FanVotes,
            totalViews: updatedScoreCardDto.totalViews !== undefined ? updatedScoreCardDto.totalViews : prevMatch.totalViews,
          };
          return newMatch;
        });

        setMatchName(updatedScoreCardDto.matchName || "Kabaddi Match");
        setRemainingTime(updatedScoreCardDto.remainingDuration);

        manageCountdownTimer(updatedScoreCardDto.status, updatedScoreCardDto.remainingDuration);
      });

      webSocketService.subscribe(commentaryTopic, (updatedCommentaryList) => {
        console.log('Received real-time Commentary update (WebSocket):', updatedCommentaryList);
        setCommentaries(updatedCommentaryList);
      });

      // Issue tracking topic for the current user/guest
      const reporterId = localStorage.getItem('user') || localStorage.getItem('guestDeviceId');
      const issueTopic = `/topic/issues/user/${reporterId}`;

      if (reporterId) {
        webSocketService.subscribe(issueTopic, (payload) => {
          const updatedIssue = typeof payload === 'string' ? JSON.parse(payload) : payload;

          // Trigger floating notification for RESOLVED and PENDING (newly submitted) issues
          if (updatedIssue.status === 'RESOLVED' || updatedIssue.status === 'PENDING') {
            setActiveNotification(updatedIssue);
            // Auto-dismiss after 8 seconds
            setTimeout(() => {
              setActiveNotification(null);
            }, 8000);
          }
        });
      }

      // Viewer tracking topic
      const viewerTopic = `/topic/match/${matchId}/viewers`;
      webSocketService.subscribe(viewerTopic, (count) => {
        setLiveViewers(count);
      });
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      webSocketService.unsubscribe(matchTopic);
      webSocketService.unsubscribe(commentaryTopic);
      const repId = localStorage.getItem('user') || localStorage.getItem('guestDeviceId');
      if (repId) webSocketService.unsubscribe(`/topic/issues/user/${repId}`);
      webSocketService.unsubscribe(`/topic/match/${matchId}/viewers`);
      webSocketService.disconnect();
    };
  }, [matchId, fetchMatchData, fetchCommentaryData, manageCountdownTimer, transformPlayers]);


  const getStatusColor = (status) => {
    switch (status) {
      case 'LIVE': return 'bg-red-500 text-white animate-pulse';
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'FINISHED': return 'bg-green-500 text-white';
      case 'UPCOMING': return 'bg-blue-500 text-white';
      case 'PAUSED': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };



  const winner = match?.status === 'COMPLETED' || match?.status === 'FINISHED'
    ? (match.team1.score > match.team2.score ? 'team1' :
      (match.team2.score > match.team1.score ? 'team2' : 'draw'))
    : null;

  // Lightweight Win Probability Calculation
  const winProbability = React.useMemo(() => {
    if (!match || match.status !== 'LIVE') return null;
    let team1Prob = 50;
    const scoreDiff = match.team1.score - match.team2.score;
    // 2.5% shift per point difference, capped at 45% either way
    let shift = Math.max(-45, Math.min(45, scoreDiff * 2.5));
    team1Prob += shift;
    return {
      team1: Math.round(team1Prob),
      team2: 100 - Math.round(team1Prob)
    };
  }, [match]);

  const currentTeamData = match ? (selectedTeam === 'team1' ? match.team1 : match.team2) : null;
  const stateMatchName = location.state ? `${location.state.team1} VS ${location.state.team2}` : "MATCH CENTRE";
  const team1Data = location.state ? { name: location.state.team1, photo: location.state.team1Photo } : (match?.team1);
  const team2Data = location.state ? { name: location.state.team2, photo: location.state.team2Photo } : (match?.team2);

  if (error) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-900 flex items-center justify-center text-red-400 text-xl">{error}</div>;
  }

  // Note: We render the main scoreboard even while loading (or null checked)
  // The loader covers it with z-index

  return (
    <>
      <AnimatePresence>
        {loading && (
          <VSLoadingScreen
            team1={team1Data}
            team2={team2Data}
            matchName={stateMatchName}
            venue={match?.venue || "Kabaddi Stadium"}
          />
        )}
      </AnimatePresence>

      {!loading && !match && (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-900 flex items-center justify-center text-gray-400 text-xl">No match data found.</div>
      )}

      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }} // Delay slightly to let loader exit finish
          className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 relative z-0"
        >
          <div className="container mx-auto max-w-7xl space-y-8 mt-3">
            {/* Unified Header */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4">

              {/* Left: Back Button */}
              <div className="flex-1 flex justify-start">
                <BackButton />
              </div>

              {/* Center: Logo & Title (Hidden on small screens if needed, or centered) */}
              <div className="flex-1 flex items-center justify-center space-x-3 text-center min-w-0">
                <div className="hidden md:block p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg">
                  <Link to={"/"}> <Flame className="w-5 h-5 text-white" /></Link>
                </div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent truncate">
                  SCOREBOARD
                </h1>
              </div>

              {/* Right: Action Button */}
              <div className="flex-1 flex justify-end">
                {isCreator ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="hidden md:flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share Match</span>
                    </button>
                    <button
                      onClick={() => setIsManageModalOpen(true)}
                      className="relative flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="hidden sm:inline">Manage Issues</span>
                      {pendingIssueCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full animate-bounce">
                          {pendingIssueCount}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share Match</span>
                    </button>
                    <button
                      onClick={() => setIsComparisonOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      <Trophy className="w-4 h-4" />
                      <span className="hidden sm:inline">Compare Players</span>
                    </button>
                    {(match?.status === 'LIVE' || match?.status === 'PAUSED') && (
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="hidden sm:inline">Report Issue</span>
                      </button>
                    )}
                    <Link
                      to="/my-reports"
                      className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">{currentUser ? 'My Reports' : 'Guest Reports'}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-4 md:p-8 border-b border-white/10">
                {/* New Header Layout with 3 equally spaced columns */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  {/* Column 1: Match Status (Aligned Left) */}
                  <div className="w-full md:flex-1 text-center md:text-left order-2 md:order-1 flex items-center justify-center md:justify-start gap-3">
                    <span className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-lg ${getStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                    {/* NEW AI SPARKLE ICON */}
                    {(match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'PAUSED') && (
                      <button
                        onClick={() => setIsAIAssistantOpen(true)}
                        title="Generate AI summary or ask questions about this match"
                        className="p-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/40 hover:to-indigo-500/40 border border-blue-400/30 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] group relative"
                      >
                         <Sparkles className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                         <span className="absolute -top-10 left-1/2 min-w-max -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Ask AI Assistant
                         </span>
                      </button>
                    )}
                    {match.status === 'UPCOMING' && (
                      <button
                        onClick={() => setIsSubscriptionOpen(true)}
                        title="Get notified when match starts"
                        className="p-2 bg-gradient-to-r from-orange-500/20 to-red-600/20 hover:from-orange-500/40 hover:to-red-600/40 border border-orange-400/30 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] group relative"
                      >
                         <Bell className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                         <span className="absolute -top-10 left-1/2 min-w-max -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Remind Me
                         </span>
                      </button>
                    )}
                  </div>

                  {/* Column 2: Match Name (Centered) */}
                  <div className="w-full md:flex-1 text-center order-1 md:order-2">
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-wide break-words">{matchName}</h2>
                  </div>

                  {/* Column 3: Live Timer (Aligned Right) */}
                  <div className="w-full md:flex-1 text-center md:text-right order-3">
                    {match.status === 'LIVE' && (
                      <div className="inline-flex items-center gap-2 text-orange-400 font-mono text-base md:text-lg bg-white/10 px-4 py-2 rounded-full">
                        <Clock className="w-4 h-4 md:w-5 md:h-5" />
                        <span>{formatTimeFromSeconds(remainingTime)}</span>
                      </div>
                    )}
                    {(match.status === 'COMPLETED' || match.status === 'PAUSED') && (
                      <div className="inline-flex items-center gap-2 text-gray-300 font-mono text-base md:text-lg bg-white/10 px-4 py-2 rounded-full">
                        <Clock className="w-4 h-4 md:w-5 md:h-5" />
                        <span>{formatTimeFromSeconds(match.remainingDuration)}</span>
                      </div>
                    )}
                    {match.status === 'UPCOMING' && (
                      <div className="inline-flex flex-col items-center md:items-end">
                        <div className="text-orange-400 font-mono text-sm md:text-base font-bold bg-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{match.scheduledStartTime ? new Date(match.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-center mb-8 gap-3 md:gap-6 text-xs md:text-sm text-gray-300">
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 shadow-sm" />
                    <span>{match.venue}, {new Date(match.date).toLocaleDateString()}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Users className="w-3 h-3 md:w-4 md:h-4 shadow-sm" />
                    <span>Managed by: <span className="text-orange-400 font-semibold">{match.creatorName || "Loading..."}</span></span>
                  </div>
                  
                  {/* Real-time Viewers Info */}
                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 pl-0 md:pl-6">
                    <div className="flex items-center gap-1.5 text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </div>
                      <span className="font-bold text-xs">{(liveViewers || 0).toLocaleString()} Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                      <Target className="w-3.5 h-3.5" />
                      <span className="font-bold text-xs">{(match.totalViews || 0).toLocaleString()} Views</span>
                    </div>
                  </div>
                </div>

                {(match.status === 'COMPLETED' || match.status === 'FINISHED') && (
                  <div className="flex justify-center gap-4 mb-6">
                    <button
                      onClick={() => handleExport('excel')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-xs md:text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold text-xs md:text-sm"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                )}



                <div className="flex flex-col md:flex-row items-center justify-around gap-6 md:gap-0">
                  <div className={`flex-1 text-center ${winner === 'team1' ? 'scale-105' : ''} transition-transform duration-300`}>
                    <div className="relative mb-3 inline-block">
                      <img
                        src={match.team1.photo}
                        alt={match.team1.name}
                        className={`w-20 h-20 md:w-32 md:h-32 rounded-full mx-auto object-contain bg-white/5 border-4 ${winner === 'team1' ? 'border-yellow-400' : 'border-white/20'}`}
                      />
                      {winner === 'team1' && <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 absolute -top-2 -right-2 bg-slate-800 rounded-full p-1" />}
                    </div>
                    <h3 className={`font-bold text-base md:text-lg mb-2 ${winner === 'team1' ? 'text-yellow-400' : 'text-white'}`}>{match.team1.name}</h3>
                    <div className={`text-4xl md:text-6xl font-bold ${winner === 'team1' ? 'text-yellow-400' : 'text-orange-400'}`}>
                      <CountUp end={match.team1.score} duration={1.5} separator="," />
                    </div>
                  </div>

                  <div className="px-4">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full p-2 md:p-3">
                      <span className="text-white font-bold text-sm md:text-lg">VS</span>
                    </div>
                  </div>

                  <div className={`flex-1 text-center ${winner === 'team2' ? 'scale-105' : ''} transition-transform duration-300`}>
                    <div className="relative mb-3 inline-block">
                      <img
                        src={match.team2.photo}
                        alt={match.team2.name}
                        className={`w-20 h-20 md:w-32 md:h-32 rounded-full mx-auto object-contain bg-white/5 border-4 ${winner === 'team2' ? 'border-yellow-400' : 'border-white/20'}`}
                      />
                      {winner === 'team2' && <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 absolute -top-2 -right-2 bg-slate-800 rounded-full p-1" />}
                    </div>
                    <h3 className={`font-bold text-base md:text-lg mb-2 ${winner === 'team2' ? 'text-yellow-400' : 'text-white'}`}>{match.team2.name}</h3>
                    <div className={`text-4xl md:text-6xl font-bold ${winner === 'team2' ? 'text-yellow-400' : 'text-orange-400'}`}>
                      <CountUp end={match.team2.score} duration={1.5} separator="," />
                    </div>
                  </div>
                </div>

                {/* --- LIVE WIN PROBABILITY METER (Below Score) --- */}
                {match.status === 'LIVE' && winProbability && (
                  <div className="w-full max-w-2xl mx-auto mt-10 px-4 transition-all duration-500 rounded-xl py-3 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5 bg-white/5">
                    <div className="flex justify-between items-center text-xs md:text-sm font-bold mb-3">
                       <span className="text-yellow-400 uppercase tracking-wider truncate max-w-[120px] md:max-w-[200px]">{match.team1.name}</span>
                       <span className="text-white/80 text-[10px] uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/10 shadow-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live Win Probability
                       </span>
                       <span className="text-orange-400 uppercase tracking-wider truncate max-w-[120px] md:max-w-[200px] text-right">{match.team2.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-yellow-400 font-mono font-bold w-12 text-right text-base md:text-xl drop-shadow-md">{winProbability.team1}%</span>
                      <div className="flex-1 h-3 md:h-4 bg-black/50 rounded-full overflow-hidden flex border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 relative overflow-hidden"
                          initial={{ width: '50%' }}
                          animate={{ width: `${winProbability.team1}%` }}
                          transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse blur-[2px]"></div>
                        </motion.div>
                        <motion.div 
                          className="h-full bg-gradient-to-l from-orange-600 to-orange-400 relative overflow-hidden"
                          initial={{ width: '50%' }}
                          animate={{ width: `${winProbability.team2}%` }}
                          transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
                        >
                          <div className="absolute inset-0 bg-white/10 w-full h-full animate-pulse blur-[2px]"></div>
                        </motion.div>
                      </div>
                      <span className="text-orange-400 font-mono font-bold w-12 text-left text-base md:text-xl drop-shadow-md">{winProbability.team2}%</span>
                    </div>
                  </div>
                )}
                {match.status === 'UPCOMING' && (
                  <div className="w-full max-w-2xl mx-auto mt-10 px-8 py-10 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md text-center">
                    <Sparkles className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wider">Battle Commencing Soon</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                      Real-time stats, live commentary, and win graphs will be activated once the match starts.
                    </p>
                    {match.scheduledStartTime && (
                      <div className="mt-6 inline-block bg-orange-500/10 border border-orange-500/30 px-6 py-2 rounded-2xl text-orange-400 font-bold">
                        Scheduled: {new Date(match.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                className={`p-4 md:p-6 border-b border-white/10 text-white text-lg md:text-2xl mx-auto
                 transition-transform duration-300 ease-in-out transform
                 ${isPopped ? 'scale-110' : 'scale-100'}
                 hover:shadow-lg hover:border-blue-400
                 relative overflow-hidden group`}
              >
                <h3 className='mx-auto relative z-10 text-center italic px-2'>{match?.liveCommentary || "Match commentary will appear here..."}</h3>

                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0
                      group-hover:opacity-100 transition-opacity duration-300
                      pointer-events-none"></div>
              </div>

              {/* Redesigned Premium MVP Card */}
              {mvp && mvp.totalPoints > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="mt-6 mb-8 max-w-sm mx-auto w-full px-4 md:px-0"
                >
                  <div className="relative bg-gradient-to-br from-yellow-600 via-orange-500 to-red-600 rounded-3xl p-6 shadow-2xl shadow-orange-500/30 border border-yellow-400/30 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl -mr-10 -mt-10" />
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full w-fit mb-3 border border-white/10 shadow-lg">
                           <Trophy className="w-4 h-4 text-yellow-300" />
                           <span className="text-xs font-bold text-yellow-100 tracking-wider uppercase">Player of the Match</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div className="relative mb-3 cursor-pointer transition-transform hover:scale-105" onClick={() => navigate(`/player/${mvp.id}`)}>
                         <div className="w-24 h-24 rounded-full border-4 border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.6)] overflow-hidden bg-slate-800 flex items-center justify-center">
                            <span className="text-5xl font-black text-white drop-shadow-md">{mvp.name.charAt(0).toUpperCase()}</span>
                         </div>
                         <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-lg border-2 border-slate-900">
                            <img src={mvp.teamPhoto} alt={mvp.teamName} className="w-8 h-8 rounded-full object-cover" />
                         </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-white text-center mb-1 drop-shadow-md cursor-pointer hover:text-yellow-200 transition-colors" onClick={() => navigate(`/player/${mvp.id}`)}>
                        {mvp.name}
                      </h3>
                      <span className="text-yellow-200 font-semibold mb-6 flex items-center gap-1 text-sm bg-black/20 px-3 py-1 rounded-full">
                        {mvp.teamName}
                      </span>

                      <div className="flex w-full justify-between items-center bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mb-1">Raid</span>
                          <span className="text-2xl font-black text-emerald-400 leading-none">{mvp.raidPoints}</span>
                        </div>
                        <div className="h-10 w-px bg-white/20 mx-2" />
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mb-1">Tackle</span>
                          <span className="text-2xl font-black text-cyan-400 leading-none">{mvp.tacklePoints}</span>
                        </div>
                        <div className="h-10 w-px bg-white/20 mx-2" />
                        <div className="flex flex-col items-center flex-1 bg-yellow-400/10 p-2 rounded-xl border border-yellow-400/20 -my-2">
                          <span className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-1">Total</span>
                          <span className="text-3xl font-black text-yellow-300 leading-none drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">{mvp.totalPoints}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* New Tab Navigation for Match Details */}
              <div className="p-4 md:p-6 border-b border-white/10">
                <h3 className="text-lg md:text-xl font-bold text-white text-center mb-4">Match Details</h3>
                <div className="flex flex-wrap md:flex-nowrap bg-white/10 rounded-2xl p-2 max-w-xl mx-auto gap-2">
                  <button
                    onClick={() => setSelectedTab('stats')}
                    className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-base ${selectedTab === 'stats' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
                  >
                    <Users className="w-4 h-4 md:w-6 md:h-6" />
                    <span>Player Stats</span>
                  </button>
                  <button
                    onClick={() => setSelectedTab('commentary')}
                    className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-base ${selectedTab === 'commentary' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
                  >
                    <MessageSquare className="w-4 h-4 md:w-6 md:h-6" />
                    <span>Commentary</span>
                  </button>
                  <button
                    onClick={() => setSelectedTab('gameroom')}
                    className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-base ${selectedTab === 'gameroom' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
                  >
                    <Gamepad2 className="w-4 h-4 md:w-6 md:h-6" />
                    <span className="hidden sm:inline">Fan Zone</span>
                  </button>
                  <button
                    onClick={() => setSelectedTab('flow')}
                    className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-base ${selectedTab === 'flow' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
                  >
                    <Flame className="w-4 h-4 md:w-6 md:h-6" />
                    <span className="hidden sm:inline">Match Flow</span>
                  </button>
                </div>
              </div>

              {/* Conditional Rendering based on selectedTab */}
              <AnimatePresence mode='wait'>
                {match.status === 'UPCOMING' && selectedTab !== 'gameroom' ? (
                   <motion.div
                    key="upcoming-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-20 text-center flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                       <Clock className="w-10 h-10 text-slate-500" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-300 uppercase tracking-tighter">Content Locked</h4>
                    <p className="text-slate-500 max-w-xs">Detailed {selectedTab} will be available as soon as the match goes LIVE.</p>
                  </motion.div>
                ) : selectedTab === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 md:p-6"
                  >
                    <h3 className="text-base md:text-lg font-bold text-white text-center mb-4">Select Team to view Player Stats</h3>
                    <div className="flex bg-white/10 rounded-2xl p-2 max-w-md mx-auto mb-6">
                      <button onClick={() => setSelectedTeam('team1')} className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-sm md:text-base ${selectedTeam === 'team1' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}>
                        <img src={match.team1.photo} alt={match.team1.name} loading="lazy" className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover" />
                        <span className="truncate">{match.team1.name}</span>
                      </button>
                      <button onClick={() => setSelectedTeam('team2')} className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-sm md:text-base ${selectedTeam === 'team2' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}>
                        <img src={match.team2.photo} alt={match.team2.name} loading="lazy" className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover" />
                        <span className="truncate">{match.team2.name}</span>
                      </button>
                    </div>

                    <div className="hidden md:grid grid-cols-6 gap-4 mb-4 p-4 bg-white/10 rounded-xl">
                      <div className="col-span-2 text-gray-400 font-semibold">Player</div>
                      <div className="text-center text-gray-400 font-semibold flex items-center justify-center space-x-1"><Target className="w-4 h-4" /><span>Raids</span></div>
                      <div className="text-center text-gray-400 font-semibold flex items-center justify-center space-x-1"><Shield className="w-4 h-4" /><span>Tackles</span></div>
                      <div className="text-center text-gray-400 font-semibold flex items-center justify-center space-x-1"><Star className="w-4 h-4" /><span>Total</span></div>
                      <div className="text-center text-gray-400 font-semibold">Performance</div>
                    </div>

                    <div className="space-y-3">
                      {currentTeamData.players.map((player, index) => (
                        <div key={index} onClick={() => navigate(`/player/${player.id}`)} className="bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-300 cursor-pointer overflow-hidden">
                          {/* Desktop Row */}
                          <div className="hidden md:grid grid-cols-6 gap-4 items-center p-4">
                            <div className="col-span-2 text-white font-semibold">{player.name}</div>
                            <div className="text-center"><span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-bold">{player.raidPoints}</span></div>
                            <div className="text-center"><span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg font-bold">{player.tacklePoints}</span></div>
                            <div className="text-center"><span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg font-bold">{player.totalPoints}</span></div>
                            <div className="text-center">
                              <div className="w-full bg-white/20 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min((player.totalPoints / 15) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Card */}
                          <div className="md:hidden p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-bold text-sm">{player.name}</span>
                              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs font-bold">Total: {player.totalPoints}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1"><Target className="w-3 h-3 text-blue-400" /> Raids: {player.raidPoints}</div>
                              <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-400" /> Tackles: {player.tacklePoints}</div>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min((player.totalPoints / 15) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{currentTeamData.players.reduce((sum, p) => sum + p.raidPoints, 0)}</div>
                          <div className="text-gray-300 text-xs md:text-sm">Total Raid Points</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-400">{currentTeamData.players.reduce((sum, p) => sum + p.tacklePoints, 0)}</div>
                          <div className="text-gray-300 text-xs md:text-sm">Total Tackle Points</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-400">{currentTeamData.players.reduce((sum, p) => sum + p.totalPoints, 0)}</div>
                          <div className="text-gray-300 text-xs md:text-sm">Team Total Points</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Live Commentary Feed ── */}
              <AnimatePresence mode='wait'>
                {selectedTab === 'commentary' && (
                  <motion.div
                    key="commentary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 md:p-6"
                  >
                    {/* Feed Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/30">
                          <MessageSquare className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white uppercase tracking-wide">Live Commentary</h3>
                          <p className="text-xs text-gray-500">{commentaries.length} event{commentaries.length !== 1 ? 's' : ''} recorded</p>
                        </div>
                      </div>
                      {match?.status === 'LIVE' && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-400 text-xs font-black uppercase tracking-widest">Live</span>
                        </div>
                      )}
                    </div>

                    {/* Ticker Feed */}
                    {commentaries.length > 0 ? (
                      <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                        <AnimatePresence initial={false}>
                          {commentaries.map((c, index) => {
                            const text = (c.commentary || '').toLowerCase();
                            // Categorise by priority: end > super > tackle > raid > score > start > general
                            const isEnd      = text.includes('end') || text.includes('final') || text.includes('complet') || text.includes('finish');
                            const isSuper    = text.includes('super');
                            const isTackle   = text.includes('tackle') || (text.includes('out') && !text.includes('raid')) || text.includes('catch');
                            const isRaid     = text.includes('raid') || text.includes('touch') || text.includes('bonus');
                            const isScore    = !isRaid && !isTackle && (text.includes('point') || text.includes('score'));
                            const isStart    = text.includes('start') || text.includes('begin') || text.includes('whistle');

                            let accent = 'border-purple-500/30 bg-purple-500/5';
                            let dotColor = 'bg-purple-400';
                            let timeColor = 'text-purple-300';
                            let icon = '📢';
                            if (isEnd)    { accent = 'border-green-500/40 bg-green-500/10'; dotColor = 'bg-green-400';  timeColor = 'text-green-300';  icon = '🏁'; }
                            else if (isSuper)  { accent = 'border-yellow-400/40 bg-yellow-400/10'; dotColor = 'bg-yellow-400'; timeColor = 'text-yellow-300'; icon = '⚡'; }
                            else if (isRaid)   { accent = 'border-orange-500/40 bg-orange-500/10'; dotColor = 'bg-orange-400'; timeColor = 'text-orange-300'; icon = '🗡️'; }
                            else if (isTackle) { accent = 'border-cyan-500/40 bg-cyan-500/10';    dotColor = 'bg-cyan-400';   timeColor = 'text-cyan-300';   icon = '🛡️'; }
                            else if (isScore)  { accent = 'border-blue-500/40 bg-blue-500/10';    dotColor = 'bg-blue-400';   timeColor = 'text-blue-300';   icon = '🎯'; }
                            else if (isStart)  { accent = 'border-emerald-500/40 bg-emerald-500/10'; dotColor = 'bg-emerald-400'; timeColor = 'text-emerald-300'; icon = '🔔'; }

                            const timeStr = c.dateAndTime
                              ? new Date(c.dateAndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '—';

                            const hasScore = c.team1Score != null && c.team2Score != null;

                            return (
                              <motion.div
                                key={c.id || index}
                                layout
                                initial={{ opacity: 0, y: -18, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                                className={`flex items-start gap-3 p-3 rounded-2xl border ${accent} transition-colors`}
                              >
                                {/* Left: dot + time */}
                                <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-[0_0_8px_currentColor] flex-shrink-0`} />
                                  {index !== commentaries.length - 1 && (
                                    <div className="w-px flex-1 min-h-[16px] bg-white/10" />
                                  )}
                                </div>

                                {/* Center: icon + text */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-base leading-none">{icon}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${timeColor}`}>{timeStr}</span>
                                    {/* Newest badge */}
                                    {index === 0 && match?.status === 'LIVE' && (
                                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white text-sm leading-snug font-medium">{c.commentary}</p>
                                </div>

                                {/* Right: score badge */}
                                {hasScore && (
                                  <div className="flex-shrink-0 bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5 text-center min-w-[52px]">
                                    <div className="text-sm font-black text-white tabular-nums leading-none">{c.team1Score}–{c.team2Score}</div>
                                    <div className="text-[9px] text-gray-500 font-medium mt-0.5">Score</div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                          <MessageSquare className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400 font-semibold">
                          {match?.status === 'LIVE'
                            ? 'Commentary will appear here as the match progresses…'
                            : 'No commentary recorded for this match.'}
                        </p>
                        {match?.status === 'LIVE' && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Waiting for first event
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fan Zone Section */}
              <AnimatePresence mode='wait'>
                {selectedTab === 'gameroom' && (
                  <motion.div
                    key="gameroom"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="p-6"
                  >
                    <FanZone match={match} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Match Flow (Graph) Section */}
              <AnimatePresence mode='wait'>
                {selectedTab === 'flow' && (
                  <motion.div
                    key="flow"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 md:p-8"
                  >
                    <div className="flex flex-col items-center justify-center mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <Flame className="w-6 h-6 text-orange-400" />
                        Momentum Shifts
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">Live point progression</p>
                    </div>

                    {matchFlowData.length > 0 ? (
                      <div className="h-[300px] md:h-[450px] w-full bg-white/5 p-4 rounded-2xl border border-white/10">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <AreaChart
                            data={matchFlowData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorTeam1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorTeam2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                              dataKey="time"
                              stroke="rgba(255,255,255,0.5)"
                              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                              tickLine={false}
                              minTickGap={30}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.5)"
                              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ fontWeight: 'bold' }}
                              labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="team1"
                              name={match.team1.name}
                              stroke="#ef4444"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorTeam1)"
                              animationDuration={1500}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="team2"
                              name={match.team2.name}
                              stroke="#06b6d4"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorTeam2)"
                              animationDuration={1500}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] w-full bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center p-6">
                        <Flame className="w-12 h-12 text-gray-600 mb-3" />
                        <h4 className="text-gray-400 font-semibold mb-1">No Momentum Data</h4>
                        <p className="text-gray-500 text-sm max-w-sm">
                          The match flow graph will automatically generate once points are scored and recorded by the scorer.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* QR Code Modal for Match Sharing */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-white/10 relative text-center"
          >
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">Scan to Join Match!</h3>
            <p className="text-gray-400 text-sm mb-6">Let the crowd scan this QR code to instantly join the Fan Zone and view live stats.</p>
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto mb-6 shadow-lg shadow-purple-500/20">
              <QRCode
                value={window.location.href}
                size={220}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
                fgColor="#0f172a" 
              />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Match link copied to clipboard!');
              }}
              className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 flex justify-center items-center gap-2 transition-all"
            >
              <Share2 className="w-5 h-5 text-gray-300" />
              Copy Match Link
            </button>
          </motion.div>
        </div>
      )}

      {/* Modals outside the main motion.div layout */}
      <ReportIssueModal
        matchId={matchId}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <IssueManagementModal
        matchId={matchId}
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />

      <PlayerComparison
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        team1={match?.team1}
        team2={match?.team2}
      />

      <AIMatchAssistantModal
        matchId={matchId}
        matchStatus={match?.status}
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
      />

      <MatchSubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        matchId={matchId}
        matchName={match?.matchName}
      />

      {/* Floating Live Ticket Notification */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
            className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900/90 backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden ${activeNotification.status === 'RESOLVED' ? 'border-green-500/30' : 'border-blue-500/30'}`}
          >
            {/* Header Strip */}
            <div className={`p-3 px-4 border-b flex justify-between items-center ${activeNotification.status === 'RESOLVED' ? 'bg-gradient-to-r from-green-500/20 to-green-600/10 border-green-500/20' : 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-blue-500/20'}`}>
              <div className={`flex items-center gap-2 font-bold ${activeNotification.status === 'RESOLVED' ? 'text-green-400' : 'text-blue-400'}`}>
                {activeNotification.status === 'RESOLVED' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {activeNotification.status === 'RESOLVED' ? 'Issue Resolved' : 'Issue Submitted'}
              </div>
              <button
                onClick={() => setActiveNotification(null)}
                className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-4 px-5">
              <p className="text-white text-sm leading-relaxed mb-3 line-clamp-3">
                {activeNotification.status === 'PENDING' ? "Your report has been successfully submitted and is under review." : `"${activeNotification.description}"`}
              </p>

              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-gray-500 font-mono">ID: {activeNotification.id?.substring(0, 6)}...</span>
                <Link
                  to="/my-reports"
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${activeNotification.status === 'RESOLVED' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'}`}
                >
                  {activeNotification.status === 'RESOLVED' ? 'View Dashboard' : 'Track Status'} &rarr;
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

export default ScoreCard;
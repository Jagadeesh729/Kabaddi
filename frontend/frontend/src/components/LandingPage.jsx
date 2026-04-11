import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MapPin, Clock, Calendar, ArrowRight, User as UserIcon, LogOut, Loader2, Trophy, SlidersHorizontal, ArrowUpDown, Flame, Plus, Filter, X, Users as UsersIcon } from 'lucide-react';
import { baseURL } from '../utils/constants';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import FanZone from './FanZone'; // Import FanZone
import webSocketService from '../service/websocket'; // Import your WebSocket service
import { Tilt } from 'react-tilt';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';


const SkeletonCard = () => (
  <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/10 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div className="h-6 w-16 bg-white/10 rounded-full"></div>
      <div className="h-4 w-12 bg-white/10 rounded"></div>
    </div>
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1 flex flex-col items-center">
        <div className="w-20 h-20 bg-white/10 rounded-full mb-3"></div>
        <div className="h-4 w-20 bg-white/10 rounded mb-2"></div>
        <div className="h-8 w-12 bg-white/10 rounded"></div>
      </div>
      <div className="px-4 flex flex-col items-center gap-2">
        <div className="h-8 w-8 bg-white/10 rounded-full"></div>
      </div>
      <div className="flex-1 flex flex-col items-center">
        <div className="w-20 h-20 bg-white/10 rounded-full mb-3"></div>
        <div className="h-4 w-20 bg-white/10 rounded mb-2"></div>
        <div className="h-8 w-12 bg-white/10 rounded"></div>
      </div>
    </div>
    <div className="h-12 w-full bg-white/10 rounded-xl"></div>
  </div>
);

const LandingPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const [activeFilter, setActiveFilter] = useState('all'); // Status filter
  const [dateFilter, setDateFilter] = useState('all'); // Date filter: 'today', 'last7', 'all'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [specificDate, setSpecificDate] = useState(''); // New specific date state
  const [teamAFilter, setTeamAFilter] = useState('');
  const [teamBFilter, setTeamBFilter] = useState('');
  const [showTeamFilter, setShowTeamFilter] = useState(false);
  const [matches, setMatches] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const user = localStorage.getItem("user");

  // Ref to hold individual match countdown timers
  const matchTimersRef = useRef({});

  // Generate particles for the background effect
  const particles = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 4 + 1}px`,
        height: `${Math.random() * 4 + 1}px`,
        animationDuration: `${Math.random() * 10 + 10}s`,
        animationDelay: `-${Math.random() * 20}s`,
        opacity: Math.random() * 0.5 + 0.2
      }
    }));
  }, []);

  // Helper function to format time
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

  const getSmartDateBadge = (dateString, status) => {
    // Only apply for UPCOMING matches
    if (status !== 'UPCOMING') return null;

    // Parse the date (assuming "YYYY-MM-DD")
    const matchDate = new Date(dateString);
    const today = new Date();
    // Reset hours to compare dates only
    today.setHours(0, 0, 0, 0);
    matchDate.setHours(0, 0, 0, 0);

    const diffTime = matchDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: "Matchday! 🔥", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    } else if (diffDays === 1) {
      return { text: "Tomorrow ⏳", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
    } else if (diffDays > 1) {
      return { text: `${diffDays} Days Left`, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    } else {
      return { text: "Delayed ⚠️", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" };
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setDateFilter('all');
    setSortOrder('newest');
    setTeamAFilter('');
    setTeamBFilter('');
    setSpecificDate(''); // Reset specific date
    setShowTeamFilter(false);
  };

  // Function to manage individual match countdowns
  const manageIndividualMatchCountdown = useCallback((matchId, status, initialRemainingDuration) => {
    // Always clear existing timer first to avoid multiple intervals for the same match
    if (matchTimersRef.current[matchId]) {
      clearInterval(matchTimersRef.current[matchId]);
      delete matchTimersRef.current[matchId];
    }

    if (status === 'LIVE' && initialRemainingDuration > 0) {
      let currentRemaining = initialRemainingDuration;

      matchTimersRef.current[matchId] = setInterval(() => {
        currentRemaining -= 1;
        setMatches(prevMatches => prevMatches.map(m =>
          m.id === matchId
            ? {
              ...m,
              time: formatTimeFromSeconds(currentRemaining),
              remainingDuration: currentRemaining,
              status: m.status
            }
            : m
        ));

        if (currentRemaining <= 0) {
          clearInterval(matchTimersRef.current[matchId]);
          delete matchTimersRef.current[matchId];
        }
      }, 1000);
    } else {
      // If not LIVE, ensure display time matches the last known duration and no timer is running
      setMatches(prevMatches => prevMatches.map(m =>
        m.id === matchId
          ? {
            ...m,
            time: formatTimeFromSeconds(initialRemainingDuration),
            remainingDuration: initialRemainingDuration,
            status: m.status
          }
          : m
      ));
    }
  }, []);

  // Fetch initial matches and setup WebSocket
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await axios.get(baseURL + '/matches/all');

        const transformedData = response.data.map(match => ({
          id: match.id,
          matchName: match.matchName,
          team1: {
            name: match.team1Name,
            photo: match.team1PhotoUrl,
            score: match.team1Score
          },
          team2: {
            name: match.team2Name,
            photo: match.team2PhotoUrl,
            score: match.team2Score
          },
          status: match.status,
          venue: match.location,
          creatorName: match.creatorName,
          date: new Date(match.createdAt).toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          rawDate: new Date(match.createdAt), // Store raw date object for better filtering
          remainingDuration: match.remainingDuration, // Store raw seconds
          time: formatTimeFromSeconds(match.remainingDuration), // Formatted for display
        }));
        setLoading(false);
        setMatches(transformedData);

        // After setting initial matches, start timers for LIVE matches
        transformedData.forEach(match => {
          manageIndividualMatchCountdown(match.id, match.status, match.remainingDuration);
        });

      } catch (error) {
        setLoading(false);
        console.error("Error fetching match data:", error);
      }
    };

    fetchMatches();

    // WebSocket setup for general live match updates
    const liveMatchesSummaryTopic = `/topic/liveMatchesSummary`; // This must match your backend topic

    webSocketService.connect(() => {
      webSocketService.subscribe(liveMatchesSummaryTopic, (matchDto) => {
        // matchDto is expected to be the MatchDto from backend

        setMatches(prevMatches => {
          const updatedMatches = prevMatches.map(match => {
            if (match.id === matchDto.id) {
              const newRemainingDuration = matchDto.remainingDuration !== undefined ? matchDto.remainingDuration : match.remainingDuration;
              const newStatus = matchDto.status || match.status;

              // Immediately update the individual match timer based on new data
              manageIndividualMatchCountdown(matchDto.id, newStatus, newRemainingDuration);

              return {
                ...match,
                team1: {
                  ...match.team1,
                  name: matchDto.team1Name, // Update name in case it changes (unlikely)
                  photo: matchDto.team1PhotoUrl || match.team1.photo,
                  score: matchDto.team1Score
                },
                team2: {
                  ...match.team2,
                  name: matchDto.team2Name, // Update name
                  photo: matchDto.team2PhotoUrl || match.team2.photo,
                  score: matchDto.team2Score
                },
                status: newStatus,
                venue: matchDto.location || match.venue,
                creatorName: matchDto.creatorName || match.creatorName,
                date: new Date(matchDto.createdAt).toLocaleDateString("en-US", {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) || match.date,
                remainingDuration: newRemainingDuration,
                time: formatTimeFromSeconds(newRemainingDuration), // Update formatted time based on new duration
              };
            }
            return match;
          });

          // If the matchDto received is for a match not currently in our 'matches' state,
          // it means it just became LIVE/PAUSED, and we should add it.
          // This ensures newly started matches appear without full page refresh.
          if (!updatedMatches.some(m => m.id === matchDto.id)) {
            const newMatchForDisplay = {
              id: matchDto.id,
              team1: {
                name: matchDto.team1Name,
                photo: matchDto.team1PhotoUrl,
                score: matchDto.team1Score
              },
              team2: {
                name: matchDto.team2Name,
                photo: matchDto.team2PhotoUrl,
                score: matchDto.team2Score
              },
              status: matchDto.status,
              venue: matchDto.location,
              creatorName: matchDto.creatorName,
              date: new Date(matchDto.createdAt).toLocaleDateString("en-US", {
                year: 'numeric', month: 'long', day: 'numeric'
              }),
              remainingDuration: matchDto.remainingDuration,
              time: formatTimeFromSeconds(matchDto.remainingDuration),
            };
            updatedMatches.push(newMatchForDisplay);
            // Start timer for this newly added match
            manageIndividualMatchCountdown(newMatchForDisplay.id, newMatchForDisplay.status, newMatchForDisplay.remainingDuration);
          }

          // Filter out matches that become 'COMPLETED' (or 'UPCOMING' again, if applicable)
          // and are no longer relevant for the live summary
          return updatedMatches.filter(m => m.status !== 'COMPLETED' && m.status !== 'UPCOMING');
        });
      });
    });

    // Cleanup function for useEffect
    return () => {
      // Clear all individual match timers
      for (const matchId in matchTimersRef.current) {
        clearInterval(matchTimersRef.current[matchId]);
      }
      matchTimersRef.current = {}; // Reset the ref

      // Unsubscribe from the all matches topic
      webSocketService.unsubscribe(liveMatchesSummaryTopic);
      // Disconnect WebSocket only if no other components are using it
      webSocketService.disconnect();
    };
  }, [manageIndividualMatchCountdown]); // Added manageIndividualMatchCountdown to dependencies

  const getStatusColor = (status) => {
    switch (status) {
      case 'LIVE': return 'bg-orange-500 text-white animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]';
      case 'UPCOMING': return 'bg-cyan-500 text-white';
      case 'COMPLETED': return 'bg-emerald-500 text-white';
      case 'PAUSED': return 'bg-amber-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getWinner = (match) => {
    if (match.status !== 'COMPLETED') return null;
    if (match.team1.score > match.team2.score) return 'team1';
    if (match.team2.score > match.team1.score) return 'team2';
    return 'draw';
  };

  // --- Extracted MatchCard Component (Memoized) ---
  // By wrapping in React.memo, this complex component will ONLY re-render 
  // if its specific 'match' prop changes, entirely bypassing re-renders during 
  // search bar typing or other filter changes that don't affect this specific match.
  const MatchCard = ({ match, index, navigate }) => {
    const winner = getWinner(match);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Tilt
          className="bg-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/10 transition-all duration-500 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/20 cursor-pointer"
          options={{
            max: 15,
            scale: 1.02,
            speed: 400,
            glare: true,
            "max-glare": 0.5,
          }}
          style={{
            transformStyle: "preserve-3d"
          }}
        >
          <div onClick={() => navigate(`/scorecard/${match.id}`, { state: { team1: match.team1.name, team2: match.team2.name, team1Photo: match.team1.photo, team2Photo: match.team2.photo } })} className="h-full w-full" style={{ transform: "translateZ(20px)" }}>
            <div className="flex justify-between items-center mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(match.status)}`} style={{ transform: "translateZ(30px)" }}>
                {match.status}
              </span>
              {(match.status === 'LIVE' || match.status === 'PAUSED') && (
                <div className="flex items-center space-x-2 text-orange-400" style={{ transform: "translateZ(30px)" }}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm">{match.time}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-6" style={{ transform: "translateZ(40px)" }}>
              <div className={`flex-1 text-center ${winner === 'team1' ? 'scale-105' : ''} transition-transform duration-300`}>
                <div className="relative mb-3 inline-block">
                  <img src={match.team1.photo} alt={match.team1.name} loading="lazy" className={`w-20 h-20 rounded-full mx-auto object-cover border-4 ${winner === 'team1' ? 'border-yellow-400' : 'border-white/20'}`} />
                  {winner === 'team1' && <Trophy className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 bg-slate-800 rounded-full p-1" />}
                </div>
                <h3 className={`font-bold mb-2 font-oswald text-xl tracking-wide ${winner === 'team1' ? 'text-yellow-400' : 'text-white'}`}>{match.team1.name}</h3>
                <div className={`text-4xl font-bold font-oswald ${winner === 'team1' ? 'text-yellow-400' : 'text-orange-400'}`}>{match.status !== 'UPCOMING' ? match.team1.score : '-'}</div>
              </div>

              <div className="px-4 flex flex-col items-center gap-2">
                {winner === 'draw' && (
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Draw
                  </span>
                )}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full p-2 shadow-lg shadow-orange-500/20">
                  <span className="text-white font-bold text-sm">VS</span>
                </div>
              </div>

              <div className={`flex-1 text-center ${winner === 'team2' ? 'scale-105' : ''} transition-transform duration-300`}>
                <div className="relative mb-3 inline-block">
                  <img src={match.team2.photo} alt={match.team2.name} loading="lazy" className={`w-20 h-20 rounded-full mx-auto object-cover border-4 ${winner === 'team2' ? 'border-yellow-400' : 'border-white/20'}`} />
                  {winner === 'team2' && <Trophy className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 bg-slate-800 rounded-full p-1" />}
                </div>

                <h3 className={`font-bold mb-2 font-oswald text-xl tracking-wide ${winner === 'team2' ? 'text-yellow-400' : 'text-white'}`}>{match.team2.name}</h3>
                <div className={`text-4xl font-bold font-oswald ${winner === 'team2' ? 'text-yellow-400' : 'text-orange-400'}`}>{match.status !== 'UPCOMING' ? match.team2.score : '-'}</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10" style={{ transform: "translateZ(25px)" }}>
              {(() => {
                const badge = getSmartDateBadge(match.date, match.status);
                return badge ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-300">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="truncate max-w-[120px]">{match.venue}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-sm text-gray-300">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{match.venue}, {match.date}</span>
                  </div>
                );
              })()}
              <div className="text-right text-gray-300 text-sm mt-1">
                {`created by-${match.creatorName}`}
              </div>
            </div>
          </div>
        </Tilt>
      </motion.div>
    );
  };

  // Custom comparison function for React.memo to prevent deep object reference issues
  const propsAreEqual = (prevProps, nextProps) => {
    // If the score, status, or timer changes, we must re-render.
    // We don't care if other unrelated array states changed in the parent.
    return (
      prevProps.index === nextProps.index &&
      prevProps.match.id === nextProps.match.id &&
      prevProps.match.status === nextProps.match.status &&
      prevProps.match.team1.score === nextProps.match.team1.score &&
      prevProps.match.team2.score === nextProps.match.team2.score &&
      prevProps.match.time === nextProps.match.time
    );
  };

  const MemoizedMatchCard = React.memo(MatchCard, propsAreEqual);


  const filteredMatches = matches
    .filter(match => {
      // 1. Status Filter
      if (activeFilter !== 'all' && match.status.toLowerCase() !== activeFilter) {
        return false;
      }

      // 2. Search Filter (Teams or Match Name)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = match.matchName ? match.matchName.toLowerCase() : '';
        const team1 = match.team1.name.toLowerCase();
        const team2 = match.team2.name.toLowerCase();
        const venue = match.venue ? match.venue.toLowerCase() : '';

        if (!matchName.includes(term) && !team1.includes(term) && !team2.includes(term) && !venue.includes(term)) {
          return false;
        }
      }

      // 4. Team vs Team Filter
      if (showTeamFilter && (teamAFilter || teamBFilter)) {
        const t1 = match.team1.name;
        const t2 = match.team2.name;

        // Exact match logic or partial? Let's go with exact because we'll likely use a select
        // But for flexibility, we'll check adherence.
        // Logic: If A is selected, one of the teams must be A.
        // If B is selected, the OTHER matching team must be B.

        let matchA = true;
        let matchB = true;

        if (teamAFilter) {
          matchA = (t1 === teamAFilter || t2 === teamAFilter);
        }

        if (teamBFilter) {
          // Team B must be the OPPONENT of Team A if Team A is selected?
          // Or just "Does this match involve Team B?"
          // Usually "Team VS Team" means A vs B. 
          // So if A is selected, we need to check if A is in the match.
          // If B is also selected, we need to check if B is in the match AND it's not the same team (validated by UI usually).
          matchB = (t1 === teamBFilter || t2 === teamBFilter);
        }

        if (!matchA || !matchB) return false;
      }

      // 3. Date Filter
      if (dateFilter !== 'all') {
        const matchDate = new Date(match.date);
        const today = new Date();
        const isToday = matchDate.toDateString() === today.toDateString();

        if (dateFilter === 'today' && !isToday) return false;

        if (dateFilter === 'last7') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (matchDate < sevenDaysAgo) return false;
        }

        if (dateFilter === 'specific' && specificDate) {
          const targetDate = new Date(specificDate);
          if (matchDate.toDateString() !== targetDate.toDateString()) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Priority: LIVE matches always first
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;

      // Secondary Sort: Date
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();

      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  const uniqueTeams = Array.from(new Set(matches.flatMap(m => [m.team1.name, m.team2.name]))).sort();



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 font-inter selection:bg-orange-500/30 flex flex-col overflow-x-hidden">
      <style>{`
        @keyframes realisticFire {
          0% { transform: scale(1) rotate(0deg); opacity: 0.8; }
          25% { transform: scale(1.1) rotate(-3deg); opacity: 1; }
          50% { transform: scale(1) rotate(3deg); opacity: 0.8; }
          75% { transform: scale(1.1) rotate(-3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
        }
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Animated Embers Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-orange-500 blur-[1px]"
            style={{
              ...p.style,
              bottom: '-20px',
              animation: `floatUp ${p.style.animationDuration} infinite linear`,
              animationDelay: p.style.animationDelay
            }}
          />
        ))}
      </div>

      {/* Background Overlay */}
      <div className="fixed inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm pointer-events-none z-0"></div>

      {/* Full-Width Navbar */}
      <div className="relative z-50 w-full bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-lg" style={{ overflow: 'visible' }}>
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          {/* Left side: Logo & Title */}
          <div className="flex items-center gap-5 group cursor-pointer overflow-visible pr-4">
            <div className="p-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg shadow-orange-500/20 transition-transform transform group-hover:scale-110">
              <Link to={"/"}> <Flame className="w-10 h-10 text-white drop-shadow-md" /></Link>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl lg:text-5xl font-black italic uppercase bg-gradient-to-r from-amber-200 via-orange-400 to-red-600 bg-clip-text text-transparent drop-shadow-sm filter brightness-110 pb-2 pr-2 leading-relaxed font-oswald"
            >
              KABADDI LEAGUE
            </motion.h1>
          </div>

          {/* Right side: Auth Buttons */}
          {user ? (
            <>
              <div className="flex items-center gap-4">
                <Link to="/mymatches" className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 text-lg font-oswald tracking-wide">
                  Mymatches
                </Link>
                <div className="flex items-center gap-4">
                  <Link to="/create-match" className="p-2 bg-white/10 rounded-full hover:bg-white/20"><Plus className="w-5 h-5 text-white" /></Link>
                  <ProfileDropdown />
                </div>
              </div>

            </>
          ) :
            (
              <>
                <div className="flex items-center gap-4">
                  <Link to="/login" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 text-lg tracking-wide font-oswald">
                    Login
                  </Link>
                  <Link to="/signup" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/20 text-lg tracking-wide font-oswald">
                    Sign Up
                  </Link>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex-grow bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-t border-white/5">
        <div className="container mx-auto px-6 py-12">


          {/* Search Bar & Filters */}
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Main Search */}
            <div className="relative group">
              <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <div className="pl-6 text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search teams, matches, or venues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-white py-5 px-4 placeholder-gray-400 focus:outline-none font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-2 mr-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">

              {/* Status Chips */}
              <div className="flex flex-wrap gap-2 p-1">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'live', label: 'LIVE' },
                  { id: 'upcoming', label: 'UPCOMING' },
                  { id: 'completed', label: 'COMPLETED' },
                  { id: 'paused', label: 'PAUSED' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm tracking-wide transition-all duration-300 ${activeFilter === filter.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md scale-105'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}

                {/* Team vs Team Toggle */}
                <button
                  onClick={() => setShowTeamFilter(!showTeamFilter)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm tracking-wide transition-all duration-300 flex items-center gap-2 ${showTeamFilter
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-orange-500'
                    }`}
                >
                  <UsersIcon className="w-4 h-4" />
                  Team VS Team
                </button>
              </div>

              <div className="hidden lg:block w-px bg-white/10 mx-2"></div>

              {/* Secondary Controls */}
              <div className="flex flex-wrap items-center gap-3 p-1 flex-1 justify-end">

                {/* Date select */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="appearance-none bg-slate-800 border-none text-gray-300 text-sm font-semibold rounded-lg pl-3 pr-8 py-2.5 hover:bg-slate-700 cursor-pointer focus:ring-2 focus:ring-orange-500/50 transition-colors"
                    >
                      <option value="all">Any Date</option>
                      <option value="today">Today</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="specific">Pick Date</option>
                    </select>
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                  {dateFilter === 'specific' && (
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="bg-slate-800 border-none text-gray-300 text-sm font-semibold rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500/50"
                    />
                  )}
                </div>

                {/* Sort Select */}
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="appearance-none bg-slate-800 border-none text-gray-300 text-sm font-semibold rounded-lg pl-3 pr-8 py-2.5 hover:bg-slate-700 cursor-pointer focus:ring-2 focus:ring-orange-500/50 transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Team VS Team Expanded Panel */}
            {showTeamFilter && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr,auto] gap-4 items-center bg-slate-900 border border-orange-500/30 p-6 rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider">Team A</label>
                  <select
                    value={teamAFilter}
                    onChange={(e) => setTeamAFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select Team</option>
                    {uniqueTeams.map(team => <option key={team} value={team}>{team}</option>)}
                  </select>
                </div>

                <div className="flex justify-center pt-6">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black text-white/20 italic">VS</div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-500 uppercase tracking-wider">Team B</label>
                  <select
                    value={teamBFilter}
                    onChange={(e) => setTeamBFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select Team</option>
                    {uniqueTeams.filter(t => t !== teamAFilter).map(team => <option key={team} value={team}>{team}</option>)}
                  </select>
                </div>

                <div className="flex justify-end pt-6">
                  <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white underline">Reset</button>
                </div>
              </div>
            )}
          </div>


          {/* Matches Section */}
          <div className="mt-8"> {/* Added top margin for separation */}
            {loading ? (
              <div className="container mx-auto px-6 pb-12">
                <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
                </motion.div>
              </div>
            ) :
              (<div className="container mx-auto px-6 pb-12">
                <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <AnimatePresence>
                    {filteredMatches.length > 0 ? (
                      filteredMatches.map((match, index) => (
                        <MemoizedMatchCard
                          key={match.id}
                          match={match}
                          index={index}
                          navigate={navigate}
                        />
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:col-span-2 flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed"
                      >
                        <div className="bg-white/5 p-4 rounded-full mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No Matches Found</h3>
                        <p className="text-gray-400 max-w-md text-center mb-6">
                          We couldn't find any matches matching "{searchTerm}" with the selected filters.
                        </p>
                        <button
                          onClick={clearFilters}
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-semibold"
                        >
                          Clear All Filters
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>)}
          </div>
        </div>

      </div>
      {/* Full-Width Footer */}
      <div className="relative z-20 w-full bg-white/5 backdrop-blur-xl border-t border-white/10 py-10 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">
              ELEVATE
            </span> YOUR GAME
          </h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 mb-8 max-w-xl mx-auto text-base"
          >
            Experience the thrill of Kabaddi like never before. Live scores, real-time updates, and the heart-pounding action of every raid.
          </motion.p>

          <div className="flex justify-center mb-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full font-black text-white text-xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-2 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 transform origin-left"></div>
              <span className="relative z-10 flex items-center gap-3">
                Enjoy the Game
                <div className="relative">
                  <Flame className="w-6 h-6 text-yellow-300 drop-shadow-md" style={{ animation: 'realisticFire 1.2s infinite alternate' }} />
                  <div className="absolute inset-0 bg-orange-500 blur-sm opacity-50 animate-pulse"></div>
                </div>
              </span>
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>&copy; 2026 Kabaddi League. All rights reserved.</p>
            <div className="flex gap-4 mt-2 md:mt-0">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
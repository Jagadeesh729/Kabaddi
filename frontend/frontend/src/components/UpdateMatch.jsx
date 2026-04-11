import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Users, Clock, Plus, Minus, Play, Pause, Power, FlagOff, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2
import { baseURL } from '../utils/constants';
import Cookies from 'universal-cookie';
import ProfileDropdown from './ProfileDropdown';
import BackButton from './BackButton';
import { IssueManagementModal } from './IssueManagementModal';
import toast from 'react-hot-toast';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

// Helper function to convert a total number of seconds into a MM:SS string for display.
const secondsToTime = (totalSeconds) => {
  const secondsNum = parseInt(totalSeconds, 10);
  if (isNaN(secondsNum) || secondsNum < 0) {
    return '00:00';
  }
  const minutes = Math.floor(secondsNum / 60);
  const seconds = secondsNum % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const UpdateMatch = () => {
  const Cookie = new Cookies();
  const token = Cookie.get('token');
  const { id: matchId } = useParams();
  const currentUserID = localStorage.getItem('user');

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [pendingIssueCount, setPendingIssueCount] = useState(0);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;

    const fetchPendingIssues = async () => {
      try {
        // Use axiosInstance or raw axios if needed, but ensure auth
        const response = await axios.get(`${baseURL}/issues/match/${matchId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const pending = response.data.filter(i => i.status === 'PENDING').length;
        setPendingIssueCount(pending);
      } catch (error) {
        console.error("Failed to fetch pending issues count", error);
      }
    };

    fetchPendingIssues();

    // Direct WebSocket setup for instant badge notifications
    const socketFactory = () => new SockJS(`${baseURL}/ws`);
    const client = Stomp.over(socketFactory);

    client.reconnect_delay = 5000;
    client.debug = () => { }; // Disable debug logs

    client.connect({}, () => {
      clientRef.current = client;

      client.subscribe(`/topic/issues/match/${matchId}`, () => {
        // Instant re-fetch exactly what we need when any new issue or update lands
        fetchPendingIssues();
      });
    }, (err) => {
      console.error("Match Badge WebSocket Connection Error:", err);
    });

    return () => {
      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.disconnect();
      }
    };
  }, [matchId, token]);

  // State to hold the backend's remainingDuration and the timestamp it was fetched
  const [serverTime, setServerTime] = useState({ remaining: 0, fetchedAt: 0 });
  // State for the client-calculated displayed time
  const [displayTime, setDisplayTime] = useState(0);

  const [updateForm, setUpdateForm] = useState({
    selectedTeam: 'teamA',
    selectedPlayer: '',
    pointType: 'raid', // Default to raid
    points: 1
  });

  const [isUpdatingScore, setIsUpdatingScore] = useState(false); // New state for loading spinner on buttons

  const mainIntervalRef = useRef(null); // Ref for the 1-second display timer
  const syncIntervalRef = useRef(null); // Ref for the periodic backend sync

  // Function to fetch match details and update state
  const fetchMatchDetails = useCallback(async (showLoading = true) => {
    if (!matchId) return;
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(baseURL + `/matchstats/match/livescorecard/${matchId}/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const apiData = response.data;
      const now = Date.now(); // Capture exact time of successful fetch

      const transformPlayers = (players) => players.map(p => ({
        id: p.playerId, name: p.playerName, raidPoints: p.raidPoints, tacklePoints: p.tacklePoints,
      }));
      const team1Players = transformPlayers(apiData.team1);
      const team2Players = transformPlayers(apiData.team2);

      const transformedData = {
        teamA: {
          name: apiData.team1Name,
          score: apiData.team1Score,
          color: 'from-red-500 to-red-600',
          players: team1Players,
        },
        teamB: {
          name: apiData.team2Name,
          score: apiData.team2Score,
          color: 'from-blue-500 to-blue-600',
          players: team2Players,
        },
        status: apiData.status || 'UPCOMING',
      };
      setMatchData(transformedData);
      setServerTime({ remaining: apiData.remainingDuration, fetchedAt: now }); // Update server time reference

      // Set initial selected player if not already set, or if team changed
      // This part now uses the *latest* `updateForm` state via a functional update
      setUpdateForm(prev => {
        const currentTeamPlayers = transformedData[prev.selectedTeam]?.players || [];
        const isCurrentPlayerStillValid = currentTeamPlayers.some(p => p.id === prev.selectedPlayer);

        if (!prev.selectedPlayer || !isCurrentPlayerStillValid) {
          return {
            ...prev,
            selectedPlayer: currentTeamPlayers.length > 0 ? currentTeamPlayers[0].id : ''
          };
        }
        return prev; // No change needed for selectedPlayer
      });

      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to fetch match data.");
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [matchId, token]); // Dependencies updated: Removed updateForm.selectedPlayer, updateForm.selectedTeam

  // Effect for initial fetch and visibility change listener
  useEffect(() => {
    // Only fetch match details on initial mount
    fetchMatchDetails();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, re-sync with backend immediately
        fetchMatchDetails(false); // Don't show loading spinner
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
    // Removed updateForm.selectedPlayer and updateForm.selectedTeam from dependencies
  }, [fetchMatchDetails]); // fetchMatchDetails itself is stable due to useCallback


  // Effect for managing the display timer and periodic backend sync
  useEffect(() => {
    // Clear any existing intervals
    if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    if (matchData && matchData.status === 'LIVE' && serverTime.remaining > 0) {
      // 1. Start a main interval to update display time every second
      mainIntervalRef.current = setInterval(() => {
        const elapsedTimeSinceFetch = Math.floor((Date.now() - serverTime.fetchedAt) / 1000);
        const calculatedTime = Math.max(0, serverTime.remaining - elapsedTimeSinceFetch);

        setDisplayTime(calculatedTime);

        // If calculated time runs out, end the match
        if (calculatedTime <= 0) {
          clearInterval(mainIntervalRef.current);
          mainIntervalRef.current = null;
          // Trigger backend end action only if it hasn't been triggered already
          // The fetchMatchDetails after handleStatusChange will update status to COMPLETED
          // which will stop this block from running again.
          if (matchData.status === 'LIVE') {
            handleStatusChange('end');
          }
        }
      }, 1000);

      // 2. Start a periodic server synchronization interval
      syncIntervalRef.current = setInterval(() => {
        fetchMatchDetails(false); // Fetch latest remainingDuration from backend
      }, 50000); // Re-sync every 10 seconds

    } else {
      // If not LIVE, ensure display time matches the last known server remaining time
      setDisplayTime(serverTime.remaining);
    }

    // Cleanup function
    return () => {
      if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchData?.status, serverTime, fetchMatchDetails]); // Depend on matchData status and serverTime updates


  const pointTypes = [
    { value: 'raid', label: 'Raid Point', points: [1, 2, 3, 4, 5, 6, 7] },
    { value: 'tackle', label: 'Tackle Point', points: [1, 2] },
    { value: 'allout', label: 'Allout Point', points: [2] },
    { value: 'technical', label: 'Technical Point', points: [1] }

    // Removed bonus and all-out points as per instructions
  ];

  const handleStatusChange = async (actionType) => {
    try {
      const response = await axios.put(`${baseURL}/matches/match/${actionType}/${matchId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(`Match ${actionType === 'start' ? 'started' : actionType === 'pause' ? 'paused' : 'resumed'} successfully!`);
      const updatedMatchDto = response.data; // This is a MatchDto, not a ScoreCard
      const now = Date.now();

      // Update basic match status and server time from the response
      setMatchData(prev => {
        if (!prev) return prev;
        return { ...prev, status: updatedMatchDto.status };
      });
      setServerTime({ remaining: updatedMatchDto.remainingDuration, fetchedAt: now });

      // If match ends, clear all intervals immediately
      if (actionType === 'end' || updatedMatchDto.status === 'COMPLETED') {
        if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        mainIntervalRef.current = null;
        syncIntervalRef.current = null;
        setDisplayTime(0); // Ensure display shows 0
      }

    } catch (err) {
      console.error(`Failed to perform action '${actionType}':`, err.response ? err.response.data : err.message);
      alert(`Error performing action: ${err.response ? err.response.data.message : err.message}. Please try again.`);
    } finally {
      // Always re-fetch to ensure all state is perfectly in sync after any status change
      // This will get the full ScoreCard including player stats
      fetchMatchDetails(false);
    }
  };

  const startMatch = () => handleStatusChange('start');
  const endMatch = () => handleStatusChange('end');
  const togglePause = () => handleStatusChange(matchData.status === 'PAUSED' ? 'resume' : 'pause');

  const handleScoreUpdate = async (pointsValue) => {
    if (!matchData) return alert('Match data not loaded.');
    if (!updateForm.selectedPlayer) return alert('Please select a player.');
    if (matchData.status !== 'LIVE') return alert('Match must be LIVE to update scores.');

    setIsUpdatingScore(true); // Start loading spinner

    const pointTypeMapping = { raid: 'RAID_POINT', tackle: 'TACKLE_POINT', allout: "ALL_OUT_POINT", technical: "TECHNICAL_POINT" }; // Removed bonus, technical, allout
    const payload = {
      teamName: matchData[updateForm.selectedTeam].name,
      playerId: updateForm.selectedPlayer,
      pointType: pointTypeMapping[updateForm.pointType],
      points: pointsValue,
    };

    try {
      // Backend returns MatchDto (basic match info), but we need the full ScoreCard
      await axios.put(`${baseURL}/matchstats/match/${matchId}/update`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Re-fetch ALL match details to ensure the frontend state is fully synchronized with the backend.
      // This will update all scores and player stats based on the backend's comprehensive ScoreCard.
      await fetchMatchDetails(false); // Don't show loading spinner for this immediate re-sync

    } catch (err) {
      console.error('Failed to update score:', err);
      alert(`Error updating score: ${err.response ? err.response.data.message : err.message}. Please try again.`);
    } finally {
      setIsUpdatingScore(false); // Stop loading spinner
    }
  };


  const getSelectedPointType = () => pointTypes.find(type => type.value === updateForm.pointType);

  const handleTeamChange = (e) => {
    const newTeam = e.target.value;
    const playersOfNewTeam = matchData[newTeam]?.players || [];
    setUpdateForm(prev => ({
      ...prev,
      selectedTeam: newTeam,
      selectedPlayer: playersOfNewTeam.length > 0 ? playersOfNewTeam[0].id : '' // Select first player of new team
    }));
  };

  const renderMatchControlButton = () => {
    // Check if matchData is null before accessing its properties
    if (!matchData) return null;

    switch (matchData.status) {
      case 'UPCOMING':
        return <button onClick={startMatch} className="flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-green-600"><Power /> Start Match</button>;
      case 'LIVE':
        return (
          <div className="flex gap-4">
            <button onClick={togglePause} className="flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600"><Pause /> Pause Match</button>
            <button onClick={endMatch} className="flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-red-600"><FlagOff /> End Match</button>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex gap-4">
            <button onClick={togglePause} className="flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-green-600"><Play /> Resume Match</button>
            <button onClick={endMatch} className="flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-red-600"><FlagOff /> End Match</button>
          </div>
        );
      case 'COMPLETED':
        return <div className="text-white font-bold py-3 px-6 rounded-xl bg-gray-600">Match Finished</div>;
      default:
        return null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-xl">Loading Match Details...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400 text-xl">{error}</div>;
  if (!matchData) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-xl">No match data found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <BackButton />
      <div className="max-w-6xl mx-auto space-y-8 mt-3">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-6">

            {/* Unified Header Layout */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">

              {/* Left: Back (or empty spacer if back is outside) - actually Back is outside, so this can be Spacer or Logo */}
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h1 className="text-3xl font-bold text-white">Pro Kabaddi League</h1>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-3">
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

                {currentUserID && <ProfileDropdown />}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm mt-4">
              <span className={`px-3 py-1 rounded-full ${matchData.status === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'} text-white font-semibold`}>{matchData.status}</span>
              <span className="text-white/80 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {secondsToTime(displayTime)} {/* Display the calculated time */}
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center"><div className={`bg-gradient-to-r ${matchData.teamA.color} rounded-2xl p-6`}><div className="text-white mb-4"><Users className="w-8 h-8 mx-auto mb-2" /><h2 className="text-xl font-bold">{matchData.teamA.name}</h2></div><div className="text-6xl font-black text-white">{matchData.teamA.score}</div></div></div>
            <div className="text-center"><div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto"><span className="text-2xl font-black text-white">VS</span></div></div>
            <div className="text-center"><div className={`bg-gradient-to-r ${matchData.teamB.color} rounded-2xl p-6`}><div className="text-white mb-4"><Users className="w-8 h-8 mx-auto mb-2" /><h2 className="text-xl font-bold">{matchData.teamB.name}</h2></div><div className="text-6xl font-black text-white">{matchData.teamB.score}</div></div></div>
          </div>
          <div className="mt-8 flex justify-center gap-4">{renderMatchControlButton()}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Score Update Panel</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">Select Team</label>
                <select className="w-full bg-white/20 rounded-xl px-4 py-3 text-white" value={updateForm.selectedTeam} onChange={handleTeamChange}>
                  <option value="teamA" className="bg-slate-800">{matchData.teamA.name}</option>
                  <option value="teamB" className="bg-slate-800">{matchData.teamB.name}</option>
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">Select Player</label>
                <select className="w-full bg-white/20 rounded-xl px-4 py-3 text-white" value={updateForm.selectedPlayer} onChange={(e) => setUpdateForm(prev => ({ ...prev, selectedPlayer: e.target.value }))}>
                  {matchData[updateForm.selectedTeam].players.map(player => (<option key={player.id} value={player.id} className="bg-slate-800">{player.name}</option>))}
                </select>
              </div>
            </div>
            <div className="md:col-span-1 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">Point Type</label>
                <select className="w-full bg-white/20 rounded-xl px-4 py-3 text-white" value={updateForm.pointType} onChange={(e) => { const selectedType = pointTypes.find(type => type.value === e.target.value); setUpdateForm(prev => ({ ...prev, pointType: e.target.value, points: selectedType?.points[0] || 1 })); }}>
                  {pointTypes.map(type => <option key={type.value} value={type.value} className="bg-slate-800">{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">Points</label>
                <select className="w-full bg-white/20 rounded-xl px-4 py-3 text-white" value={updateForm.points} onChange={(e) => setUpdateForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}>
                  {getSelectedPointType()?.points.map(point => <option key={point} value={point} className="bg-slate-800">{point} {point === 1 ? 'Point' : 'Points'}</option>)}
                </select>
              </div>
            </div>
            <div className="md:col-span-1 flex items-end gap-3">
              <button onClick={() => handleScoreUpdate(updateForm.points)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl" disabled={isUpdatingScore}>
                {isUpdatingScore ? <Loader2 className="animate-spin" /> : <Plus />}Add
              </button>
              <button onClick={() => handleScoreUpdate(-updateForm.points)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 px-4 rounded-xl" disabled={isUpdatingScore}>
                {isUpdatingScore ? <Loader2 className="animate-spin" /> : <Minus />}Deduct
              </button>
            </div>
          </div>
        </div>

      </div>
      <IssueManagementModal
        matchId={matchId}
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </div>

  );
};

export default UpdateMatch;
import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar, MapPin, Users, Trophy, Search, Save, Camera, Clock } from 'lucide-react'; // Added Clock icon
import axiosInstance from '../utils/axiosConfig';
import Cookies from 'universal-cookie';
import { useNavigate } from 'react-router-dom';
import BackButton from './BackButton';

const CreateMatch = () => {
  const [allPlayers, setAllPlayers] = useState([]);

  const [formData, setFormData] = useState({
    venue: '',
    date: '',
    time: '40', // New: Default match duration in minutes
    team1: {
      name: '',
      logo: null,
      players: []
    },
    team2: {
      name: '',
      logo: null,
      players: []
    }
  });

  const [logoPreviews, setLogoPreviews] = useState({ team1: null, team2: null });
  const [searchTerms, setSearchTerms] = useState({ team1: '', team2: '' });
  const [activeStep, setActiveStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const userId = localStorage.getItem("user");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (showPreview) {
      const timer = setTimeout(() => {
        navigate('/mymatches');
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [showPreview, navigate]);

  const fetchPlayers = async () => {
    try {
      const response = await axiosInstance.get('/users/all');
      // headers handled by interceptor

      const playerPositions = ['raider', 'defender', 'all-rounder'];
      const transformedPlayers = response.data.map(user => ({
        id: user.playerId,
        name: user.playerName,
        position: playerPositions[Math.floor(Math.random() * playerPositions.length)]
      }));

      setAllPlayers(transformedPlayers);
    } catch (error) {
      console.error("Failed to fetch players:", error);
      alert("Could not load player data. Please try again later.");
    }
  };

  const positions = [
    { value: 'raider', label: 'Raider', color: 'text-red-400' },
    { value: 'defender', label: 'Defender', color: 'text-blue-400' },
    { value: 'all-rounder', label: 'All-Rounder', color: 'text-green-400' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamChange = (team, field, value) => {
    setFormData(prev => ({ ...prev, [team]: { ...prev[team], [field]: value } }));
  };

  const handleLogoChange = (team, event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [team]: { ...prev[team], logo: file } }));
      setLogoPreviews(prev => ({ ...prev, [team]: URL.createObjectURL(file) }));
    }
  };

  const addPlayer = (team, player) => {
    setFormData(prev => ({
      ...prev,
      [team]: { ...prev[team], players: [...prev[team].players, player] }
    }));
  };

  const removePlayer = (team, playerId) => {
    setFormData(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        players: prev[team].players.filter(p => p.id !== playerId)
      }
    }));
  };

  const getTodayString = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.venue) errors.push('Venue is required');
    if (!formData.date) errors.push('Date is required');
    if (!formData.time || parseInt(formData.time) <= 0) errors.push('Match duration must be a positive number');
    if (!formData.team1.name) errors.push('Team 1 name is required');
    if (!formData.team2.name) errors.push('Team 2 name is required');
    if (formData.team1.players.length < 7) errors.push('Team 1 must have at least 7 players');
    if (formData.team2.players.length < 7) errors.push('Team 2 must have at least 7 players');
    return errors;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      setLoading(false);
      return;
    }

    const apiFormData = new FormData();
    apiFormData.append('matchName', `${formData.team1.name} vs ${formData.team2.name}`);
    apiFormData.append('team1Name', formData.team1.name);
    apiFormData.append('team2Name', formData.team2.name);
    if (formData.team1.logo) {
      apiFormData.append('team1Photo', formData.team1.logo);
    }
    if (formData.team2.logo) {
      apiFormData.append('team2Photo', formData.team2.logo);
    }
    apiFormData.append('createdBy', userId);

    formData.team1.players.forEach(player => {
      apiFormData.append('team1Players', player.id);
    });

    formData.team2.players.forEach(player => {
      apiFormData.append('team2Players', player.id);
    });
    apiFormData.append('totalDuration', parseInt(formData.time)); // Use the new time field
    apiFormData.append('location', formData.venue);
    apiFormData.append('matchDate', formData.date);

    try {
      await axiosInstance.post('/matches/create', apiFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Authorization handled by interceptor
        }
      });
      setShowPreview(true);
    } catch (error) {
      console.error("Failed to create match:", error);

      const status = error.response?.status;
      const data = error.response?.data;
      const serverMsg =
        data?.message ||
        data?.error ||
        (typeof data === "string" ? data : null);

      alert(
        `Error creating match${status ? ` (HTTP ${status})` : ""}: ${serverMsg || error.message}`
      );
    } finally {
      setLoading(false);
    }

  };

  const steps = [
    { id: 1, title: 'Match Details', icon: Calendar },
    { id: 2, title: 'Team 1', icon: Users },
    { id: 3, title: 'Team 2', icon: Users },
    { id: 4, title: 'Review', icon: Trophy }
  ];

  const renderTeamForm = (teamKey) => {
    const currentTeamPlayers = formData[teamKey].players;
    const opponentTeamPlayers = teamKey === 'team1' ? formData.team2.players : formData.team1.players;
    const addedPlayerIds = [...currentTeamPlayers.map(p => p.id), ...opponentTeamPlayers.map(p => p.id)];

    const searchResults = allPlayers
      .filter(p => !addedPlayerIds.includes(p.id))
      .filter(p => (p.name || '').toLowerCase().includes((searchTerms[teamKey] || '').toLowerCase()));

    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 font-oswald tracking-wide">
          {teamKey === 'team1' ? 'Team 1 Details' : 'Team 2 Details'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <label className="block text-gray-300 font-medium mb-2">Team Name</label>
            <input
              type="text"
              placeholder="Enter team name"
              value={formData[teamKey].name}
              onChange={(e) => handleTeamChange(teamKey, 'name', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <label className="block text-gray-300 font-medium mb-2">Team Logo</label>
            <label htmlFor={`${teamKey}-logo-upload`} className="w-full cursor-pointer bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white flex items-center justify-center gap-2">
              {logoPreviews[teamKey] ? (
                <img src={logoPreviews[teamKey]} alt="preview" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-gray-400" />
              )}
              <span>{formData[teamKey].logo ? formData[teamKey].logo.name : 'Upload Logo'}</span>
            </label>
            <input id={`${teamKey}-logo-upload`} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoChange(teamKey, e)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4 font-oswald">Available Players</h3>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for players..."
                value={searchTerms[teamKey]}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, [teamKey]: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <span className="text-white font-medium">{player.name}</span>
                    <span className={`ml-2 text-xs ${positions.find(p => p.value === player.position)?.color}`}>{player.position}</span>
                  </div>
                  <button onClick={() => addPlayer(teamKey, player)} className="bg-green-500/20 text-green-400 p-2 rounded-lg"><Plus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4 font-oswald">Current Squad ({currentTeamPlayers.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {currentTeamPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div>
                    <span className="text-white font-medium">{player.name}</span>
                    <span className={`ml-2 text-xs ${positions.find(p => p.value === player.position)?.color}`}>{player.position}</span>
                  </div>
                  <button onClick={() => removePlayer(teamKey, player.id)} className="bg-red-500/20 text-red-400 p-2 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <BackButton />
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Match Created Successfully!</h2>
                <p className="text-gray-300">Your Kabaddi match has been scheduled</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8">
              <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Match Information</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-300">
                  <div><span className="text-orange-400">Venue:</span> {formData.venue}</div>
                  <div><span className="text-orange-400">Date:</span> {formData.date}</div>
                  <div><span className="text-orange-400">Duration:</span> {formData.time} mins</div> {/* Display duration */}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[formData.team1, formData.team2].map((team, teamIndex) => (
                  <div key={teamIndex} className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {logoPreviews[`team${teamIndex + 1}`] && <img src={logoPreviews[`team${teamIndex + 1}`]} alt={team.name} className="w-12 h-12 rounded-full object-cover" />}
                      <h3 className="text-xl font-bold text-white">{team.name}</h3>
                    </div>
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-white font-medium">{player.name}</span>
                          <span className={`text-sm font-medium ${positions.find(p => p.value === player.position)?.color}`}>{positions.find(p => p.value === player.position)?.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <BackButton />
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent font-oswald tracking-wider">
            Create Kabaddi Match
          </h1>
          <p className="text-xl text-gray-300 mt-4">Set up a new match with teams, players, and venue details</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            {steps.map((step) => (
              <div key={step.id} className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${activeStep === step.id ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : activeStep > step.id ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                <step.icon className="w-5 h-5" />
                <span className="font-medium">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden">
          {activeStep === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 font-oswald tracking-wide">Match Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Changed to 3 columns */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Venue</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter venue name"
                      value={formData.venue}
                      onChange={(e) => handleInputChange('venue', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 pl-12 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.date}
                      min={getTodayString()}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 pl-12 py-3 text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Duration (mins)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      min="1" // Minimum duration
                      placeholder="e.g., 40"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 pl-12 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && renderTeamForm('team1')}
          {activeStep === 3 && renderTeamForm('team2')}

          {activeStep === 4 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 font-oswald tracking-wide">Review Match Details</h2>
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 font-oswald">Match Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-300"> {/* Changed to 3 columns */}
                    <div><span className="text-orange-400">Venue:</span> {formData.venue || 'Not set'}</div>
                    <div><span className="text-orange-400">Date:</span> {formData.date || 'Not set'}</div>
                    <div><span className="text-orange-400">Duration:</span> {formData.time} mins</div> {/* Display duration */}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[formData.team1, formData.team2].map((team, teamIndex) => (
                    <div key={teamIndex} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-4 mb-3">
                        {logoPreviews[`team${teamIndex + 1}`] && <img src={logoPreviews[`team${teamIndex + 1}`]} alt={team.name} className="w-12 h-12 rounded-full object-cover" />}
                        <h3 className="text-xl font-bold text-white">{team.name || `Team ${teamIndex + 1}`}</h3>
                      </div>
                      <div className="text-gray-400 text-sm mb-3">
                        {team.players.length} players
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {team.players.map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                            <span className="text-white text-sm">{player.name}</span>
                            <span className={`text-xs ${positions.find(p => p.value === player.position)?.color}`}>
                              {positions.find(p => p.value === player.position)?.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/5 px-8 py-6 border-t border-white/10">
            <div className="flex justify-between">
              <button onClick={() => setActiveStep(s => Math.max(1, s - 1))} disabled={activeStep === 1 || loading} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl disabled:opacity-50">Previous</button>
              {activeStep < 4 ? (
                <button onClick={() => setActiveStep(s => Math.min(4, s + 1))} disabled={loading} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50">Next</button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Create Match</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMatch;

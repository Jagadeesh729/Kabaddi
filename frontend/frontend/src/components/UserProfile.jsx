import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { User, Mail, Phone, MapPin, Calendar, Camera, Edit2, Save, X, Lock, PersonStanding, Weight, GitCommitVertical, Loader2, Trophy, Target, AlertTriangle } from 'lucide-react';
import Cookies from 'universal-cookie';
import BackButton from './BackButton';

const UserProfile = () => {
  const cookies = new Cookies();
  const token = cookies.get('token');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true); // Single loading state for all async ops
  const [error, setError] = useState(null);

  const userId = localStorage.getItem('user');

  // Effect for fetching user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true); // Start loading when fetching
        setError(null); // Clear any previous errors

        const response = await axiosInstance.get(`/users/userdetails/${userId}`);
        const data = response.data;

        const formattedData = {
          name: data.name,
          username: data.username,
          password: '', // Do NOT store actual password from API. Use empty string for edit field.
          phone: data.phone,
          location: data.location,
          joinDate: data.createdAt,
          bio: data.about,
          avatar: data.url,
          height: data.height || '',
          weight: data.weight || '',
          age: data.age || '',
        };

        setProfileData(formattedData);
        setTempData(formattedData);
      } catch (err) {
        setError('Failed to fetch user profile.');
        console.error(err);
      } finally {
        setLoading(false); // End loading when fetch completes
      }
    };

    fetchUserData();
  }, [userId, token]); // Dependencies for useEffect

  const handleEdit = () => {
    // Reset password field in tempData, as we don't store it from API
    setTempData({ ...profileData, password: '' });
    setAvatarPreview(null);
    setIsEditing(true);
    setError(null); // Clear errors when starting to edit
  };

  const handleSave = async () => {
    setLoading(true); // Start loading when saving
    setError(null); // Clear any previous errors

    const updatePayload = new FormData();

    updatePayload.append('name', tempData.name);
    updatePayload.append('username', tempData.username);
    updatePayload.append('phone', tempData.phone);
    updatePayload.append('location', tempData.location);
    updatePayload.append('about', tempData.bio);
    updatePayload.append('height', tempData.height);
    updatePayload.append('weight', tempData.weight);
    updatePayload.append('age', tempData.age);

    // Only append password if the field is not empty, implying a change
    if (tempData.password !== '') {
      updatePayload.append("password", tempData.password);
    }

    if (tempData.avatar instanceof File) {
      updatePayload.append('image', tempData.avatar);
    }

    try {
      await axiosInstance.put(`/users/user/update/${userId}`, updatePayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      // Update profileData. Avatar needs special handling.
      // If a new file was uploaded, avatarPreview holds its URL. Otherwise, use existing.
      // If a new file was selected but not yet uploaded, tempData.avatar is a File object.
      // After successful upload, the backend should return the new URL. For client-side
      // update, we can use avatarPreview or assume the old URL if no new file was selected.
      const newAvatarUrl = avatarPreview || profileData.avatar;

      // Update the main profileData, but keep password empty as it's not truly stored client-side
      setProfileData({ ...tempData, avatar: newAvatarUrl, password: '' });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
      alert(`Error: Could not update profile. ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false); // End loading when save completes
    }
  };

  const handleCancel = () => {
    setTempData({ ...profileData, password: '' }); // Reset password field on cancel
    setAvatarPreview(null);
    setIsEditing(false);
    setError(null); // Clear errors on cancel
  };

  const handleInputChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTempData(prev => ({ ...prev, avatar: file }));
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Initial loading state for fetching profile data
  if (loading && !profileData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white text-xl">
      <Loader2 className="animate-spin h-10 w-10 mb-4 text-orange-500" />
      <span className='text-3xl'>Loading Profile...</span>
    </div>
  );

  if (error && !loading) return <div className="min-h-screen flex items-center justify-center text-red-400 text-xl">{error}</div>;
  if (!profileData && !loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-xl">User not found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <BackButton />
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden mt-3">

          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-8 relative ">
            <div className="flex flex-col sm:flex-row items-center gap-8">

              <div className="relative group">
                <div className="w-32 h-32 rounded-full ring-4 ring-white/20 overflow-hidden shadow-2xl">
                  {/* Display avatar preview if available, otherwise current profile avatar */}
                  <img
                    src={avatarPreview || profileData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {isEditing && (
                  <>
                    <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-2 transition-all duration-300 cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </>
                )}
              </div>

              <div className="text-center sm:text-left text-white flex-grow">
                <h1 className="text-4xl font-bold mb-2">{isEditing ? tempData.name : profileData.name}</h1>
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm mt-4">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full"><MapPin className="w-4 h-4 text-orange-400" /><span className="text-gray-300">{isEditing ? tempData.location : profileData.location}</span></div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full"><Calendar className="w-4 h-4 text-orange-400" /><span className="text-gray-300">Joined {formatDate(profileData.joinDate)}</span></div>
                </div>
              </div>

              <div className="flex-shrink-0">
                {!isEditing ? (
                  <button onClick={handleEdit} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold"><Edit2 className="w-5 h-5" />Edit Profile</button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={loading} // Disable button while loading (saving)
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? ( // Show spinner if loading
                        <>
                          <Loader2 className="animate-spin w-4 h-4" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                    <button onClick={handleCancel} disabled={loading} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"><X className="w-4 h-4" />Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid lg:grid-cols-3 gap-8">

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Contact & Security</h2>
                <div className="space-y-4">
                  {['name', 'username', 'phone', 'password', 'location'].map(field => {
                    const icons = { name: User, username: Mail, phone: Phone, password: Lock, location: MapPin };
                    const Icon = icons[field];
                    return (
                      <div key={field}>
                        <label className="block text-sm font-semibold text-gray-400 mb-2 capitalize">{field}</label>
                        {isEditing ? (
                          <input
                            // Since username is often an email, we keep type='email' for browser validation
                            type={field === 'username' ? 'email' : field === 'password' ? 'password' : 'text'}
                            value={tempData[field]}
                            placeholder={field === 'password' ? 'Leave blank to keep current' : ''}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl">
                            <Icon className="w-5 h-5 text-orange-400" />
                            <span className="text-gray-300 font-medium truncate">
                              {field === 'password' ? '********' : profileData[field]}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Physical Attributes</h2>
                <div className="space-y-4">
                  {['age', 'height', 'weight'].map(field => {
                    const icons = { age: PersonStanding, height: GitCommitVertical, weight: Weight };
                    const labels = { age: 'Age (Years)', height: 'Height (cm)', weight: 'Weight (kg)' };
                    const Icon = icons[field];
                    return (
                      <div key={field}>
                        <label className="block text-sm font-semibold text-gray-400 mb-2 capitalize">{labels[field]}</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={tempData[field]}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl"><Icon className="w-5 h-5 text-orange-400" /><span className="text-gray-300 font-medium truncate">{profileData[field]}</span></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">About Me</h2>
                {isEditing ? (
                  <textarea
                    value={tempData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows="12"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10 ">
                    <p className="text-gray-400 leading-relaxed">{profileData.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-8 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">My Activity</h2>
            <div className="flex gap-4 flex-wrap">
              <a href="/mymatches" className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl">
                <Trophy className="w-5 h-5" />
                My Matches
              </a>
              <a href={`/player/${userId}`} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl">
                <Target className="w-5 h-5" />
                Public Stats
              </a>
              <a href="/my-reports" className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl">
                <AlertTriangle className="w-5 h-5" />
                My Reports
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
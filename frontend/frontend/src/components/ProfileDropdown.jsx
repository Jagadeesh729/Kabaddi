import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, UserCircle, ChartNoAxesColumnIncreasing, Medal } from 'lucide-react';
import Cookies from 'universal-cookie';
const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  // 1. Manage user state locally within this component
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // 2. useEffect to get user data from localStorage when the component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        // Safely parse the user object and set it to state
        setUser(storedUser);
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error);
        // If data is corrupted, clear it
        localStorage.removeItem('user');
      }
    }
  }, []); // The empty array [] ensures this effect runs only once

  // Effect to handle clicks outside of the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 3. Re-implement handleLogout to work without context
  const handleLogout = () => {
    // Clear the user data from localStorage
    localStorage.removeItem('user');
    const cookies = new Cookies();
    cookies.remove('token')
    // Clear the local state
    setUser(null);

    setIsOpen(false);
    navigate('/');
  };

  // 4. This check now uses the local state, which is populated from localStorage
  if (!user) {
    return null; // Don't render anything if the user is not logged in
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The User Icon Button (no change) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors duration-300 cursor-pointer"
        aria-label="Open user menu"
      >
        <User className="w-6 h-6 text-white" />
      </button>

      {/* The Dropdown Menu */}
      <div
        className={`absolute right-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl overflow-hidden transition-all duration-200 ease-out z-50
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`
        }
        style={{ transformOrigin: 'top right' }}
      >
        <div className="p-2">
          {/* 5. The profile link is now dynamic using the user ID from local state */}
          <Link
            to={`/profile`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 transition-colors duration-200"
          >
            <UserCircle className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link
            to={`/player/${user}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 transition-colors duration-200"
          >
            <ChartNoAxesColumnIncreasing className="w-5 h-5" />
            <span>Player Stats</span>
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 transition-colors duration-200"
          >
            <Medal className="w-5 h-5" />
            <span>Leaderboard</span>
          </Link>
          {/* Logout Button (no change) */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDropdown;
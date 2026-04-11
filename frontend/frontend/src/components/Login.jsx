import React, { useState } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';
import { baseURL } from '../utils/constants';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast'; // ✅ import toast + Toaster

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const cookies = new Cookies();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(baseURL + '/auth/login', {
        username: email,
        password,
      });

      localStorage.setItem('user', response.data.user);
      cookies.set('token', response.data.token, { path: '/' });

      toast.success('Login successful! 🎉'); // ✅ success toast
      navigate('/');

    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';

      toast.error(errorMessage); // ✅ error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      {/* ✅ Toaster added here */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 shadow-2xl p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            welcome back!
          </h1>
          <p className="text-gray-400 mt-2">Sign in to manage your matches</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="text"
                placeholder="your username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded bg-white/10 border-white/20 text-orange-500 focus:ring-orange-500 cursor-pointer"
                disabled={loading}
              />
              <label htmlFor="remember" className="text-gray-400 cursor-pointer">Remember me</label>
            </div>
            <a
              href="#"
              className={`font-medium text-orange-400 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:text-orange-500'}`}
              onClick={(e) => loading && e.preventDefault()}
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300
                        ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:from-orange-600 hover:to-red-700 transform hover:scale-105 hover:shadow-lg'}
                        focus:outline-none focus:ring-4 focus:ring-orange-500/50 flex items-center justify-center`}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 w-5 h-5" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Signup link */}
          <div className="text-center">
            <Link to="/signup" className="font-medium text-sm text-gray-400 hover:text-orange-400 transition-colors">
              Create a new account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

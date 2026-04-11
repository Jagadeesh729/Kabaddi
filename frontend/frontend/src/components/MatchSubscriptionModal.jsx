import React, { useState } from 'react';
import { Mail, Bell, X, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';

const MatchSubscriptionModal = ({ isOpen, onClose, matchId, matchName }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      await axios.post(`http://localhost:8080/matches/${matchId}/subscribe`, {
        email
      });
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setEmail('');
      }, 2000);
    } catch (error) {
      console.error('Subscription failed:', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-8 overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="flex items-center justify-center w-16 h-16 mb-6 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/20 rotate-3">
            <Bell className="w-8 h-8 text-white animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Follow the Action
          </h2>
          <p className="text-slate-400 text-center mb-8">
            Get instant match alerts for <span className="text-orange-400 font-semibold">{matchName}</span> directly in your inbox.
          </p>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-green-400 font-medium">You're all set! Check your email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <span>Notify Me</span>
                )}
              </button>

              {status === 'error' && (
                <p className="text-red-400 text-sm text-center">Something went wrong. Please try again.</p>
              )}

              <p className="text-xs text-center text-slate-500 pt-4 px-4 overflow-hidden">
                Notifications include "Starting Soon" reminders, Real-time status updates, and Match results.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchSubscriptionModal;

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Loader2, Trophy, Flame, TrendingUp, Presentation } from 'lucide-react';
import axiosInstance from '../utils/axiosConfig';
import { baseURL } from '../utils/constants';

const AIMatchAssistantModal = ({ matchId, matchStatus, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your AI Match Assistant. I can analyze this ${matchStatus === 'LIVE' ? 'ongoing' : matchStatus === 'PAUSED' ? 'paused' : matchStatus === 'UPCOMING' ? 'upcoming' : 'completed'} game for you. What would you like to know?` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axiosInstance.post(`${baseURL}/matches/${matchId}/ai-assistant`, {
        question: queryText
      });

      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      console.error("AI Analysis error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error connecting to the AI service. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionText) => {
    handleSend(actionText);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden border border-blue-500/20 shadow-2xl shadow-blue-500/10 flex flex-col h-[85vh] md:h-[70vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-blue-500/20 p-4 md:p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                AI Match Assistant
              </h2>
              <p className="text-xs text-blue-300/70">Powered by Google Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div 
                  className={`p-3 md:p-4 rounded-2xl text-sm md:text-base whitespace-pre-line leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none border border-blue-500' 
                      : 'bg-white/5 text-gray-200 rounded-bl-none border border-white/10'
                    }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex mr-auto items-start"
            >
              <div className="p-4 rounded-2xl rounded-bl-none bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Analyzing match...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-900/80 border-t border-blue-500/20 p-4 shrink-0">
          
          {/* Quick Actions (Only show if few messages, to save space later) */}
          {messages.length < 5 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none hide-scrollbar mask-edges">
              {(matchStatus === 'LIVE' || matchStatus === 'PAUSED' || matchStatus === 'UPCOMING') && (
                <button 
                  onClick={() => handleQuickAction(matchStatus === 'UPCOMING' ? "Based on player stats and team history, who is likely to win this upcoming match?" : "Predict the winning team based on the current score and their historical win/loss records.")}
                  className="shrink-0 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  <TrendingUp className="w-3 h-3" /> {matchStatus === 'UPCOMING' ? 'Predict Winner' : 'Predict Winner'}
                </button>
              )}
              
              {matchStatus === 'UPCOMING' && (
                <button 
                  onClick={() => handleQuickAction("Compare the two teams' strengths and weaknesses for this upcoming match.")}
                  className="shrink-0 flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  <Presentation className="w-3 h-3" /> Team Comparison
                </button>
              )}

              {matchStatus !== 'UPCOMING' && (
                <button 
                  onClick={() => handleQuickAction(matchStatus === 'COMPLETED' ? "Summarize this match." : "Based on lifetime stats and current performance, who is the expected Top Performer of this match?")}
                  className="shrink-0 flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  <Presentation className="w-3 h-3" /> {matchStatus === 'COMPLETED' ? 'Summary' : 'Expected Top Performer'}
                </button>
              )}
              
              <button 
                onClick={() => handleQuickAction(matchStatus === 'UPCOMING' ? "Who are the key players to watch in this upcoming match?" : "Who is the top performer in this match so far?")}
                className="shrink-0 flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              >
                <Trophy className="w-3 h-3" /> {matchStatus === 'UPCOMING' ? 'Key Players' : 'Top Performer'}
              </button>
              
              {matchStatus !== 'UPCOMING' && (
                <button 
                  onClick={() => handleQuickAction("What were the key moments or turning points in the commentary?")}
                  className="shrink-0 flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  <Flame className="w-3 h-3" /> Key Moments
                </button>
              )}
            </div>
          )}

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
            className="flex gap-2 relative shadow-lg"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about the match..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`px-4 md:px-6 py-3 rounded-xl flex items-center justify-center transition-all ${
                !inputValue.trim() || isLoading
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AIMatchAssistantModal;

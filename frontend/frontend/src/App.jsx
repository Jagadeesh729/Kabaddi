import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';

// Eagerly loaded for instant transition to VS loading screen
import ScoreCard from './components/ScoreCard';

// Lazy load components
const LandingPage = lazy(() => import('./components/LandingPage'));
const PlayerProfile = lazy(() => import('./components/PlayerProfile'));
const CreateMatch = lazy(() => import('./components/CreateMatch'));
const UpdateMatch = lazy(() => import('./components/UpdateMatch'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const Mymatches = lazy(() => import('./components/Mymatches'));
const MyReports = lazy(() => import('./components/MyReports'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
  </div>
);

// Standard Page Transition (Home, etc.)
const StandardPageTransition = ({ children }) => (
  <motion.div
    className="w-full min-h-screen"
    initial={{ opacity: 0, filter: "blur(10px)" }}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, filter: "blur(5px)", transition: { duration: 0.3 } }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Match Page Transition (Special "Broadcast" Feel)
const MatchPageTransition = ({ children }) => (
  <motion.div
    className="w-full min-h-screen"
    // Entry: Instant (handled by VSLoadingScreen internal animation)
    initial={{ opacity: 1 }}
    animate={{ opacity: 1 }}
    // Exit: Instant (loader handled by BackButton)
    exit={{ opacity: 0, transition: { duration: 0.1 } }}
  >
    {children}
  </motion.div>
);

const App = () => {
  const location = useLocation();

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        {/* AnimatePresence mode="wait" ensures old page exits before new one enters */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<StandardPageTransition><LandingPage /></StandardPageTransition>} />
            <Route path="/login" element={<StandardPageTransition><Login /></StandardPageTransition>} />
            <Route path="/signup" element={<StandardPageTransition><Signup /></StandardPageTransition>} />

            {/* Match Page uses specialized transition */}
            <Route path="/scorecard/:matchId" element={<MatchPageTransition><ScoreCard /></MatchPageTransition>} />

            <Route path="/player/:id" element={<StandardPageTransition><PlayerProfile /></StandardPageTransition>} />
            <Route path="/create-match" element={<StandardPageTransition><CreateMatch /></StandardPageTransition>} />
            <Route path="/update-match/:id" element={<StandardPageTransition><UpdateMatch /></StandardPageTransition>} />
            <Route path="/profile" element={<StandardPageTransition><UserProfile /></StandardPageTransition>} />
            <Route path="/mymatches" element={<StandardPageTransition><Mymatches /></StandardPageTransition>} />
            <Route path="/my-reports" element={<StandardPageTransition><MyReports /></StandardPageTransition>} />
            <Route path="/leaderboard" element={<StandardPageTransition><Leaderboard /></StandardPageTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Toaster position="top-right" />
    </>
  )
}

export default App;



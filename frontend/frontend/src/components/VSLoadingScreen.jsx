import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Radio, ScanLine, Wifi } from 'lucide-react';

const VSLoadingScreen = ({ team1, team2 }) => {
  // Animation Phases:
  // 0: Initial Void (0s)
  // 1: Arena Activation (0.2s) - Scanlines, Light Beams
  // 2: Team Entry (1.2s) - Logos Slide in
  // 3: Real-Time Sync (2.5s) - Radar/Waveform Active
  // 4: Anticipation Build-Up (3.8s) - Intensify Glow/Pulse
  // 5: Cinematic Transition (4.5s) - Parent unmounts/Exit animation
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Arena Activation
      await new Promise(r => setTimeout(r, 200));
      setPhase(1);

      // Phase 2: Team Entry
      await new Promise(r => setTimeout(r, 1000));
      setPhase(2);

      // Phase 3: Real-Time Sync
      await new Promise(r => setTimeout(r, 1300));
      setPhase(3);

      // Phase 4: Anticipation Build-Up
      await new Promise(r => setTimeout(r, 1300));
      setPhase(4);
    };
    sequence();
  }, []);

  const getTeamImage = (team) => {
    if (team?.photo) return team.photo;
    const name = team?.name || "Team";
    return `https://ui-avatars.com/api/?name=${name.split(' ').join('+')}&background=random&size=200`;
  };

  const t1Image = getTeamImage(team1);
  const t2Image = getTeamImage(team2);
  const t1Name = team1?.name || "Team A";
  const t2Name = team2?.name || "Team B";

  // --- Animation Variants ---
  const scanlineVariants = {
    hidden: { top: "-10%", opacity: 0 },
    scan: {
      top: "120%",
      opacity: [0, 1, 1, 0],
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  };

  const teamSlideVariants = {
    hiddenLeft: { x: -300, opacity: 0, filter: "blur(20px)" },
    hiddenRight: { x: 300, opacity: 0, filter: "blur(20px)" },
    visible: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 60, damping: 15, mass: 1.2 }
    },
    // Phase 4: Intensify
    intensify: {
      scale: 1.05,
      filter: "brightness(1.2)",
      transition: { duration: 0.5, ease: "easeInOut" }
    }
  };

  const centerVsVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 200, damping: 20, delay: 0.2 }
    },
    intensify: {
      scale: 1.15,
      textShadow: "0 0 30px rgba(234,88,12,0.8)",
      transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-orange-500/30"
      // Phase 5: Cinematic Transition (Exit) controlled by ScoreCard unmount
      exit={{
        scale: 1.2,
        opacity: 0,
        filter: "blur(20px)",
        transition: { duration: 0.8, ease: "easeInOut" }
      }}
    >
      {/* ==================== Phase 1: Background Atmosphere ==================== */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Deep Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"></div>

        {/* Subtle Faint Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 0.15 : 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:80px_80px]"
        ></motion.div>

        {/* Ambient Spotlights - Intensify in Phase 4 */}
        <motion.div
          animate={phase >= 4 ? { opacity: 0.6, scale: 1.2 } : { opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, ease: "easeInOut" }} // Faster in Phase 4
          className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[100px]"
        ></motion.div>
        <motion.div
          animate={phase >= 4 ? { opacity: 0.6, scale: 1.2 } : { opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
          className="absolute bottom-[-20%] right-[20%] w-[60%] h-[60%] bg-red-600/10 rounded-full blur-[100px]"
        ></motion.div>
      </div>

      {/* ==================== Phase 1: Arena Activation (Scanline) ==================== */}
      <AnimatePresence>
        {phase === 1 && (
          <motion.div
            variants={scanlineVariants}
            initial="hidden"
            animate="scan"
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.8)] z-40"
          />
        )}
      </AnimatePresence>

      {/* ==================== Main Content Container ==================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center h-full">

        {/* Phase 2: Team Entry Intro */}
        <div className="flex flex-row items-center justify-center gap-4 md:gap-16 w-full">

          {/* Team 1 (Left) */}
          <motion.div
            variants={teamSlideVariants}
            initial="hiddenLeft"
            animate={phase >= 4 ? "intensify" : (phase >= 2 ? "visible" : "hiddenLeft")}
            className="flex flex-col items-center group"
          >
            <div className="relative w-32 h-32 md:w-56 md:h-56">
              <motion.div
                animate={phase >= 4 ? { opacity: 0.6, scale: 1.1 } : { opacity: 0.2 }}
                className="absolute inset-0 bg-orange-500 rounded-full blur-2xl transition-all duration-500"
              ></motion.div>
              <div className="w-full h-full rounded-full border-[3px] border-white/20 bg-slate-900 shadow-2xl relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 z-20 pointer-events-none"></div>
                <img src={t1Image} alt={t1Name} className="w-full h-full object-cover relative z-10" />
              </div>
            </div>
            {phase >= 2 && (
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-gray-300 font-bold text-sm md:text-lg uppercase tracking-widest text-center"
              >
                {t1Name}
              </motion.h2>
            )}
          </motion.div>

          {/* Center VS & Phase 3 Sync */}
          <div className="relative flex flex-col items-center justify-center w-20 md:w-32 h-32">

            {/* Using 'VS' Text with Glow */}
            <motion.div
              variants={centerVsVariants}
              initial="hidden"
              animate={phase >= 4 ? "intensify" : (phase >= 2 ? "visible" : "hidden")}
              className="relative z-20"
            >
              <div className="relative">
                <h1 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-white via-orange-200 to-orange-500 drop-shadow-[0_0_20px_rgba(234,88,12,0.4)]">VS</h1>
              </div>
            </motion.div>

            {/* Phase 3: Real-Time Sync Interaction (Radar Sweep) */}
            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] z-10 pointer-events-none"
                >
                  {/* Radar Sweep Effect behind VS */}
                  <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_3s_linear_infinite]">
                    <div className="w-full h-1/2 bg-gradient-to-l from-transparent to-white/10 blur-xl"></div>
                  </div>
                  {/* Inner Pulse Ring */}
                  <div className="absolute inset-8 rounded-full border border-orange-500/20 animate-ping"></div>

                  {/* Horizontal Energy Connection */}
                  <motion.div
                    className="absolute top-1/2 left-[-60%] right-[-60%] h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                    animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Team 2 (Right) */}
          <motion.div
            variants={teamSlideVariants}
            initial="hiddenRight"
            animate={phase >= 4 ? "intensify" : (phase >= 2 ? "visible" : "hiddenRight")}
            className="flex flex-col items-center group"
          >
            <div className="relative w-32 h-32 md:w-56 md:h-56">
              <motion.div
                animate={phase >= 4 ? { opacity: 0.6, scale: 1.1 } : { opacity: 0.2 }}
                className="absolute inset-0 bg-red-600 rounded-full blur-2xl transition-all duration-500"
              ></motion.div>
              <div className="w-full h-full rounded-full border-[3px] border-white/20 bg-slate-900 shadow-2xl relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent opacity-50 z-20 pointer-events-none"></div>
                <img src={t2Image} alt={t2Name} className="w-full h-full object-cover relative z-10" />
              </div>
            </div>
            {phase >= 2 && (
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-gray-300 font-bold text-sm md:text-lg uppercase tracking-widest text-center"
              >
                {t2Name}
              </motion.h2>
            )}
          </motion.div>

        </div>

        {/* ==================== Phase 3: Status Text ==================== */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 md:bottom-24 flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3 px-6 py-2 rounded-full">
                <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-cyan-100/80 font-mono text-xs md:text-sm tracking-[0.2em] uppercase">
                  {phase >= 4 ? "Connecting to Live Match..." : "Connecting to Live Match..."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default VSLoadingScreen;

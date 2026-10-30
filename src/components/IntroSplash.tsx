import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Activity, Zap } from 'lucide-react';

interface IntroSplashProps {
  onComplete: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onComplete }) => {
  const [show, setShow] = useState<boolean>(true);

  // Auto-dismiss after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(onComplete, 400); // Allow exit transition
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleDismiss}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white cursor-pointer select-none overflow-hidden"
        >
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-radial from-sky-500/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

          {/* Precision Biometric Radar Reticle Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] border border-slate-700/60 rounded-full" />
            <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] border border-dashed border-slate-700/80 rounded-full animate-[spin_60s_linear_infinite]" />
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-slate-700/60 to-transparent" />
          </div>

          {/* Central Logo & Brand Card */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-md w-full">
            {/* Animated Logo Emblem */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative mb-6"
            >
              {/* Outer Glowing Aura */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-sky-500/20 via-cyan-400/25 to-emerald-400/20 blur-xl"
              />

              {/* Logo SVG Container */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900/90 border border-slate-700/80 p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                >
                  <defs>
                    <linearGradient id="introGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="45%" stopColor="#22d3ee" />
                      <stop offset="75%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* MoveNet Pose Reticle */}
                  <circle cx="50" cy="50" r="34" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <path
                    d="M 28 68 L 44 26 L 54 74 L 72 40"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeOpacity="0.25"
                    strokeDasharray="2 3"
                  />

                  {/* Animated Drawing Path of the Biometric Pulse Wave */}
                  <motion.path
                    d="M 16 52 L 28 52 L 35 62 L 44 26 L 54 74 L 63 36 L 72 52 L 84 52"
                    stroke="url(#introGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 0.9,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.15,
                    }}
                  />

                  {/* Landmark Joint Nodes lighting up in sequence */}
                  <motion.circle
                    cx="35"
                    cy="62"
                    r="4"
                    fill="#38bdf8"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  />
                  <motion.circle
                    cx="44"
                    cy="26"
                    r="4.5"
                    fill="#ffffff"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 1] }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  />
                  <motion.circle
                    cx="54"
                    cy="74"
                    r="4.5"
                    fill="#34d399"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 1] }}
                    transition={{ delay: 0.65, duration: 0.3 }}
                  />
                  <motion.circle
                    cx="63"
                    cy="36"
                    r="4"
                    fill="#38bdf8"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ delay: 0.75, duration: 0.3 }}
                  />
                </svg>
              </div>
            </motion.div>

            {/* Typography: FormPulse Brand Reveal */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-1.5 sm:gap-2 mb-2"
            >
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
                FORM
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent font-display drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                PULSE
              </span>
            </motion.div>

            {/* Tagline / Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="text-xs sm:text-sm text-slate-400 tracking-wide font-medium mb-6 uppercase text-center"
            >
              Real-Time AI Biomechanics &amp; Kinematics
            </motion.p>

            {/* Ready Status Capsule */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.85, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-inner"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono-numbers text-[11px] text-slate-300">
                MoveNet Neural Engine Ready · Squats &amp; Push-Ups
              </span>
            </motion.div>

            {/* Skip / Enter Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.4 }}
              className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              <span>Click anywhere to start</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

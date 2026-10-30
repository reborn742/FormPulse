import React from 'react';

interface FormPulseLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
  withGlow?: boolean;
}

export const FormPulseLogo: React.FC<FormPulseLogoProps> = ({
  size = 40,
  className = '',
  animated = false,
  withGlow = true,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient Radial Glow */}
      {withGlow && (
        <div
          className="absolute inset-0 rounded-2xl bg-sky-500/20 blur-md pointer-events-none"
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-sm"
      >
        <defs>
          {/* Brand Gradient: Electric Sky to Emerald */}
          <linearGradient id="fpPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Accent Neon Pulse Gradient */}
          <linearGradient id="fpPulseGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="85%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Core Glow Filter */}
          <filter id="fpGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Tech Squircle / Hex Shield with subtle gradient border */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="22"
          className="fill-slate-900/90 stroke-slate-800"
          strokeWidth="2"
        />

        {/* Inner Sub-grid Lines (Movement tracking radar reticle) */}
        <circle cx="50" cy="50" r="32" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="50" y1="18" x2="50" y2="82" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="18" y1="50" x2="82" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />

        {/* Biomechanical Joint Coordinate Rays (Kinematic Framework) */}
        <path
          d="M 28 68 L 44 32 L 62 20 L 76 68"
          stroke="url(#fpPrimaryGrad)"
          strokeWidth="1.5"
          strokeOpacity="0.3"
          strokeDasharray="2 2"
        />

        {/* Dynamic ECG Biometric Pulse Wave:
            Flows from left flat -> dip -> explosive apex jump -> stabilization -> right */}
        <path
          d="M 16 52 L 28 52 L 35 62 L 44 26 L 54 74 L 63 36 L 72 52 L 84 52"
          stroke="url(#fpPulseGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#fpGlowFilter)"
          className={animated ? 'animate-pulse' : ''}
        />

        {/* Anatomical Landmark Joints (MoveNet Tracking Nodes) */}
        {/* Node 1: Left Chamber */}
        <circle cx="35" cy="62" r="3" fill="#38bdf8" />
        <circle cx="35" cy="62" r="5.5" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Node 2: Peak Drive / Extension Apex */}
        <circle cx="44" cy="26" r="3.5" fill="#ffffff" />
        <circle cx="44" cy="26" r="6.5" stroke="#38bdf8" strokeWidth="1.5" />

        {/* Node 3: Bottom Depth Valley (Rebound core) */}
        <circle cx="54" cy="74" r="3.5" fill="#34d399" />
        <circle cx="54" cy="74" r="6.5" stroke="#10b981" strokeWidth="1.5" />

        {/* Node 4: Secondary Stabilization Peak */}
        <circle cx="63" cy="36" r="3" fill="#38bdf8" />
        <circle cx="63" cy="36" r="5.5" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>
    </div>
  );
};

import React from 'react';
import { Settings, Volume2, VolumeX, RefreshCw, History } from 'lucide-react';
import { FormPulseLogo } from './FormPulseLogo';

interface HeaderProps {
  activeExercise: 'squat' | 'pushup';
  onSelectExercise: (exercise: 'squat' | 'pushup') => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onResetSession: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  fps: number;
  cameraActive: boolean;
  historyCount?: number;
  onReplayIntro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeExercise,
  onSelectExercise,
  onOpenSettings,
  onOpenHistory,
  onResetSession,
  soundEnabled,
  onToggleSound,
  fps,
  cameraActive,
  historyCount = 0,
  onReplayIntro,
}) => {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Aesthetic Logo & Wordmark */}
      <div
        onClick={onReplayIntro}
        title="FormPulse - Click to replay intro animation"
        className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
      >
        <FormPulseLogo
          size={36}
          withGlow={true}
          className="group-hover:scale-105 transition-transform duration-200"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1 leading-tight">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white font-display">
              FORM
            </span>
            <span className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent font-display">
              PULSE
            </span>
          </div>
          <span className="hidden sm:block text-[10px] text-slate-400 leading-none mt-0.5 tracking-wide">
            {activeExercise === 'squat' ? 'AI Squat Biomechanics' : 'AI Push-Up Biomechanics'}
          </span>
        </div>
      </div>

      {/* Zone 2: Exercise Switcher & Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Exercise Switcher Tabs */}
        <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => onSelectExercise('squat')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] sm:min-h-[36px] ${
              activeExercise === 'squat'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Squats
          </button>
          <button
            onClick={() => onSelectExercise('pushup')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] sm:min-h-[36px] ${
              activeExercise === 'pushup'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Push-Ups
          </button>
        </div>

        {cameraActive && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-3 border-l border-slate-800">
            <span>
              FPS: <strong className="text-sky-400 font-mono-numbers">{fps}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Zone 3: Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* History Button */}
        <button
          onClick={onOpenHistory}
          title="View Stored Workout History (Date & Time)"
          className="h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs"
          aria-label="View Workout History"
        >
          <History className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="bg-sky-500/20 text-sky-300 font-mono-numbers text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-sky-500/30">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Audio Cues' : 'Unmute Audio Cues'}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          aria-label={soundEnabled ? 'Mute Audio Cues' : 'Unmute Audio Cues'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={onResetSession}
          title="Reset Repetition Counter"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          aria-label="Reset Repetition Counter"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title={`${activeExercise === 'squat' ? 'Squat' : 'Push-Up'} Thresholds & Settings`}
          className="h-9 sm:h-10 px-2.5 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors whitespace-nowrap shadow-sm shadow-sky-500/20"
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Settings</span>
        </button>
      </div>
    </header>
  );
};

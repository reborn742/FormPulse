import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Timer,
  AlertCircle,
  Compass,
  Flame,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  FormIssue,
  LiveBiomechanics,
  SquatConfig,
  SquatPhase,
} from '../types/squat';

interface WorkoutDashboardProps {
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  phase: SquatPhase;
  biomechanics: LiveBiomechanics | null;
  activeIssues: FormIssue[];
  config: SquatConfig;
  isPaused: boolean;
  isCameraActive: boolean;
  sessionSeconds: number;
  onEndWorkout: () => void;
}

export const WorkoutDashboard: React.FC<WorkoutDashboardProps> = ({
  validReps,
  totalAttempts,
  rejectedReps,
  phase,
  biomechanics,
  activeIssues,
  config,
  isPaused,
  isCameraActive,
  sessionSeconds,
  onEndWorkout,
}) => {
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const successRate =
    totalAttempts > 0 ? Math.round((validReps / totalAttempts) * 100) : 100;

  const currentKneeAngle = biomechanics?.currentKneeAngle ?? null;
  const torsoLeanAngle = biomechanics?.torsoLeanAngle ?? null;

  // Calculate knee flexion percentage towards depth
  // 170 deg = 0%, targetDepth (e.g. 95 deg) = 100%
  let depthProgress = 0;
  if (currentKneeAngle !== null) {
    const standingAngle = config.standingAngleThreshold;
    const targetAngle = config.targetDepthAngle;
    const totalRange = standingAngle - targetAngle;
    if (totalRange > 0) {
      depthProgress = Math.min(
        100,
        Math.max(0, Math.round(((standingAngle - currentKneeAngle) / totalRange) * 100))
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 4-Card Primary Metrics Strip: 2-col on mobile, 4-col on tablet full-width, 2-col in desktop sidebar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Valid Reps */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Valid Reps</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-white font-mono-numbers">
              {validReps}
            </span>
            <span className="text-xs text-emerald-400/90 font-medium">reps</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Target Depth:</span>
            <span className="text-slate-300 font-mono-numbers font-medium">≤{config.targetDepthAngle}°</span>
          </div>
        </div>

        {/* Total Attempts / Accuracy */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rep Accuracy</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-white font-mono-numbers">
              {successRate}%
            </span>
            <span className="text-xs text-slate-400 font-mono-numbers">({totalAttempts} attempts)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Form Quality:</span>
            <span className={successRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
              {successRate >= 80 ? 'Excellent' : 'Needs Depth'}
            </span>
          </div>
        </div>

        {/* Rejected / Incomplete */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Incomplete Reps</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-slate-200 font-mono-numbers">
              {rejectedReps}
            </span>
            <span className="text-xs text-rose-400/80 font-medium">rejected</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Shallow / Timed out</span>
          </div>
        </div>

        {/* Workout Timer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Session Time</span>
            <Timer className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-white font-mono-numbers">
              {formatTime(sessionSeconds)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Status:</span>
            <span className={!isCameraActive ? 'text-slate-400 font-medium' : isPaused ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
              {!isCameraActive ? 'Stopped' : isPaused ? 'Paused' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Biomechanics Diagnostic Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Live Biomechanics Diagnostic</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>View: <strong className="text-slate-200 capitalize">{biomechanics?.detectedView || config.viewMode}</strong></span>
            <span>·</span>
            <span>Tracked Side: <strong className="text-slate-200 capitalize">{biomechanics?.detectedSide || 'Auto'}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Depth Gauge */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Squat Depth Progress</span>
              <span className="font-mono-numbers text-slate-200 font-semibold">
                {currentKneeAngle !== null ? `${currentKneeAngle}° (Target ≤${config.targetDepthAngle}°)` : 'Waiting for body'}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  depthProgress >= 100
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'bg-sky-500'
                }`}
                style={{ width: `${depthProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono-numbers">
              <span>Standing (162°)</span>
              <span>Parallel (95°)</span>
              <span>Deep (80°)</span>
            </div>
          </div>

          {/* Torso Lean Gauge */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Torso Forward Lean</span>
              <span className="font-mono-numbers text-slate-200 font-semibold">
                {torsoLeanAngle !== null ? `${torsoLeanAngle}° (Limit <${config.maxTorsoLeanAngle}°)` : 'Waiting for body'}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  torsoLeanAngle !== null && torsoLeanAngle > config.maxTorsoLeanAngle
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : torsoLeanAngle !== null && torsoLeanAngle > config.maxTorsoLeanAngle - 10
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    torsoLeanAngle !== null ? (torsoLeanAngle / 70) * 100 : 0
                  )}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono-numbers">
              <span>0° (Upright)</span>
              <span>45° (Max Safe)</span>
              <span>70° (Extreme)</span>
            </div>
          </div>
        </div>

        {/* Real-time Sitting Position & Foot Plant Diagnosis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sitting Depth:</span>
            <span
              className={`text-xs font-semibold ${
                biomechanics?.sittingStatus === 'deep_sitting' || biomechanics?.sittingStatus === 'parallel_sitting'
                  ? 'text-emerald-400'
                  : biomechanics?.sittingStatus === 'half_sitting'
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {biomechanics?.sittingStatus === 'deep_sitting'
                ? 'Deep Proper Sitting'
                : biomechanics?.sittingStatus === 'parallel_sitting'
                ? 'Proper Sitting (Parallel)'
                : biomechanics?.sittingStatus === 'half_sitting'
                ? 'Half Sitting (Partial)'
                : 'Upright Standing'}
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Foot &amp; Toe Flatness:</span>
            <span
              className={`text-xs font-semibold ${
                biomechanics?.isFootFlat === false
                  ? 'text-rose-400 font-bold'
                  : biomechanics?.isFootFlat === true
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {biomechanics?.isFootFlat === false
                ? 'Heel Lifted · Toes Up ⚠'
                : biomechanics?.isFootFlat === true
                ? 'Feet Flat on Floor ✓'
                : 'Calibrating Floor'}
            </span>
          </div>
        </div>

        {/* Active Issues Banner */}
        {activeIssues.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{activeIssues[0].message}</span>
          </div>
        )}

        {/* Bottom Finish Workout Action */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Ready to review your completed repetitions and biomechanical warnings?
          </p>
          <button
            onClick={onEndWorkout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5"
          >
            <span>Finish &amp; Summary</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

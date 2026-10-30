import React from 'react';
import {
  PushupPhase,
  LivePushupBiomechanics,
  PushupConfig,
  FormCategoryCheck,
} from '../types/pushup';
import {
  CheckCircle2,
  XCircle,
  Award,
  Timer,
  Activity,
  Flame,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface PushupDashboardProps {
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  phase: PushupPhase;
  biomechanics: LivePushupBiomechanics | null;
  formChecks: {
    hands: FormCategoryCheck;
    elbows: FormCategoryCheck;
    depth: FormCategoryCheck;
    core: FormCategoryCheck;
    legs: FormCategoryCheck;
    neck: FormCategoryCheck;
  } | null;
  config: PushupConfig;
  isPaused: boolean;
  isCameraActive: boolean;
  sessionSeconds: number;
  onEndWorkout: () => void;
}

export const PushupDashboard: React.FC<PushupDashboardProps> = ({
  validReps,
  totalAttempts,
  rejectedReps,
  phase,
  biomechanics,
  formChecks,
  config,
  sessionSeconds,
  onEndWorkout,
}) => {
  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const accuracy = totalAttempts > 0 ? Math.round((validReps / totalAttempts) * 100) : 100;

  // Visual phase indicator styling
  const phaseColors: Record<PushupPhase, { bg: string; text: string; label: string }> = {
    TOP: { bg: 'bg-slate-800 text-slate-200 border-slate-700', text: 'text-slate-300', label: 'Top Plank' },
    DESCENDING: { bg: 'bg-sky-950/80 text-sky-300 border-sky-500/50', text: 'text-sky-400', label: 'Descending' },
    BOTTOM: { bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50', text: 'text-emerald-400', label: 'Bottom Chest' },
    ASCENDING: { bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50', text: 'text-amber-400', label: 'Ascending' },
  };

  // Helper for Category Diagnostic badge
  const renderCategoryCard = (
    title: string,
    check: FormCategoryCheck | undefined,
    categoryKey: string
  ) => {
    const status = check?.status || 'unknown';
    const message = check?.message || 'Awaiting detection';

    let statusBg = 'bg-slate-900/60 border-slate-800 text-slate-400';
    let icon = <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    let badgeText = 'Off-Screen / Scanning';
    let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

    if (status === 'good') {
      statusBg = 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      badgeText = 'Good Form';
      badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (status === 'needs_correction') {
      statusBg = 'bg-rose-950/30 border-rose-500/30 text-rose-300';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      badgeText = 'Correction';
      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }

    return (
      <div
        key={categoryKey}
        className={`p-2.5 rounded-xl border transition-colors flex flex-col justify-between gap-1.5 ${statusBg}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-xs font-semibold text-slate-200">{title}</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${badgeStyle}`}>
            {badgeText}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
          {message}
        </p>
      </div>
    );
  };

  const elbowAngle = biomechanics?.currentElbowAngle !== null && biomechanics?.currentElbowAngle !== undefined
    ? Math.round(biomechanics.currentElbowAngle)
    : null;

  const trunkDev = biomechanics?.trunkDeviationAngle !== null && biomechanics?.trunkDeviationAngle !== undefined
    ? Math.round(biomechanics.trunkDeviationAngle)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 4-Metric Primary Strip: 2-col on mobile, 4-col on tablet, 2-col in desktop sidebar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Valid Push-Ups */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Valid Reps</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono-numbers mt-1.5">
            {validReps}
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-1 font-mono-numbers">
            ≤{config.targetBottomElbowAngle}° Elbow Flexion
          </div>
        </div>

        {/* Rep Accuracy */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rep Accuracy</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono-numbers mt-1.5">
            {accuracy}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono-numbers">
            {totalAttempts} total attempts
          </div>
        </div>

        {/* Invalid / Incomplete */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Incomplete</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono-numbers mt-1.5">
            {rejectedReps}
          </div>
          <div className="text-[11px] text-rose-400/90 mt-1">
            Shallow / hip sag
          </div>
        </div>

        {/* Workout Duration */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Session Time</span>
            <Timer className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono-numbers mt-1.5">
            {formatTime(sessionSeconds)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Workout</span>
          </div>
        </div>
      </div>

      {/* Live Biomechanics Gauges Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Live Biomechanical Readouts
            </h2>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-md border font-mono font-semibold ${phaseColors[phase].bg}`}
          >
            {phaseColors[phase].label}
          </span>
        </div>

        {/* Elbow Angle Progress Gauge */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Elbow Flexion Angle:</span>
            <span className="font-mono-numbers font-bold text-white text-sm">
              {elbowAngle !== null ? `${elbowAngle}°` : '—'}
              <span className="text-xs font-normal text-slate-400 ml-1">
                (Target ≤{config.targetBottomElbowAngle}°)
              </span>
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
            {/* Visual target zone marker (<=90 deg) */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/25 border-r border-emerald-500"
              style={{ width: `${(config.targetBottomElbowAngle / 180) * 100}%` }}
              title="Target bottom depth zone"
            />
            {/* Lockout zone marker (>=158 deg) */}
            <div
              className="absolute top-0 bottom-0 bg-sky-500/20 border-l border-sky-500"
              style={{
                left: `${(config.topElbowExtensionAngle / 180) * 100}%`,
                right: 0,
              }}
              title="Top lockout zone"
            />
            {/* Current angle cursor */}
            {elbowAngle !== null && (
              <div
                className={`h-full transition-all duration-100 ${
                  elbowAngle <= config.targetBottomElbowAngle
                    ? 'bg-emerald-400'
                    : elbowAngle >= config.topElbowExtensionAngle
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (elbowAngle / 180) * 100))}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers">
            <span>0° (Deep)</span>
            <span className="text-emerald-400 font-medium">{config.targetBottomElbowAngle}° Depth Goal</span>
            <span className="text-sky-400">{config.topElbowExtensionAngle}° Lockout</span>
            <span>180° (Straight)</span>
          </div>
        </div>

        {/* Plank Alignment / Trunk Deviation Gauge */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Plank Spine Alignment:</span>
            <span className="font-mono-numbers font-bold text-white text-sm">
              {trunkDev !== null ? `${trunkDev}° dev` : '—'}
              <span className="text-xs font-normal text-slate-400 ml-1">
                (Limit ≤{config.maxTrunkDeviationAngle}°)
              </span>
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
            {/* Safe zone */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/30"
              style={{ width: `${(config.maxTrunkDeviationAngle / 45) * 100}%` }}
            />
            {trunkDev !== null && (
              <div
                className={`h-full transition-all duration-100 ${
                  trunkDev <= config.maxTrunkDeviationAngle
                    ? 'bg-emerald-400'
                    : trunkDev <= config.maxTrunkDeviationAngle + 8
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (trunkDev / 45) * 100)}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers">
            <span className="text-emerald-400">0° (Flat Plank)</span>
            <span className="text-amber-400">{config.maxTrunkDeviationAngle}° Max Deviation</span>
            <span className="text-rose-400">45° (Sag / Pike)</span>
          </div>
        </div>
      </div>

      {/* 6-Category Real-Time Diagnostic Matrix */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              6-Point Form Analysis Matrix
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Real-time local kinematics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {renderCategoryCard('A. Hands & Wrists', formChecks?.hands, 'hands')}
          {renderCategoryCard('B. Elbow Mechanics', formChecks?.elbows, 'elbows')}
          {renderCategoryCard('C. Chest & Depth', formChecks?.depth, 'depth')}
          {renderCategoryCard('D. Core & Plank', formChecks?.core, 'core')}
          {renderCategoryCard('E. Legs & Knees', formChecks?.legs, 'legs')}
          {renderCategoryCard('F. Neck & Head', formChecks?.neck, 'neck')}
        </div>
      </div>

      {/* End Workout Button */}
      <button
        onClick={onEndWorkout}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
      >
        <Flame className="w-4 h-4 text-amber-400" />
        <span>Finish Workout &amp; View Summary</span>
      </button>
    </div>
  );
};

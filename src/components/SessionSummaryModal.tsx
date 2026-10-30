import React from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { RepRecord } from '../types/squat';
import { PushupRepRecord } from '../types/pushup';
import { FormPulseLogo } from './FormPulseLogo';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewSession: () => void;
  reps: RepRecord[];
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  exerciseType?: 'squat' | 'pushup';
  pushupReps?: PushupRepRecord[];
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  onStartNewSession,
  reps,
  validReps,
  totalAttempts,
  rejectedReps,
  exerciseType = 'squat',
  pushupReps = [],
}) => {
  if (!isOpen) return null;

  // Aggregate true issues and warnings frequencies
  const warningCounts: Record<string, number> = {};
  let totalDepthSum = 0;
  let totalDurationSum = 0;
  let validRepCount = 0;

  if (exerciseType === 'pushup') {
    for (const rep of pushupReps) {
      if (rep.isValid) {
        totalDepthSum += rep.minElbowAngle;
        totalDurationSum += rep.durationMs;
        validRepCount += 1;
      }
      for (const issue of rep.issues) {
        warningCounts[issue] = (warningCounts[issue] || 0) + 1;
      }
    }
  } else {
    for (const rep of reps) {
      if (rep.isValid) {
        totalDepthSum += rep.minKneeAngle;
        totalDurationSum += rep.durationMs;
        validRepCount += 1;
      }
      for (const issue of rep.issues) {
        let key = issue;
        if (issue.startsWith('Insufficient depth')) key = 'Insufficient depth';
        if (issue.startsWith('Excessive forward lean')) key = 'Excessive forward lean';
        warningCounts[key] = (warningCounts[key] || 0) + 1;
      }
    }
  }

  const sortedWarnings = Object.entries(warningCounts).sort((a, b) => b[1] - a[1]);

  const avgDepth =
    validRepCount > 0 ? Math.round(totalDepthSum / validRepCount) : null;
  const avgDurationSec =
    validRepCount > 0 ? (totalDurationSum / validRepCount / 1000).toFixed(1) : null;

  const successPercent =
    totalAttempts > 0 ? Math.round((validReps / totalAttempts) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <FormPulseLogo size={38} withGlow={true} />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display">Workout Session Summary</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                FormPulse Kinematics · <span className="text-emerald-400 font-medium">Saved to History</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-xs">
          {/* Key Totals Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl sm:rounded-2xl">
              <div className="text-slate-400 text-[10px] sm:text-[11px] mb-1">Attempts</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono-numbers">{totalAttempts}</div>
            </div>

            <div className="p-2.5 sm:p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl sm:rounded-2xl">
              <div className="text-emerald-400 text-[10px] sm:text-[11px] mb-1">Valid Reps</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono-numbers">{validReps}</div>
            </div>

            <div className="p-2.5 sm:p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl sm:rounded-2xl">
              <div className="text-rose-400 text-[10px] sm:text-[11px] mb-1">Incomplete</div>
              <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono-numbers">{rejectedReps}</div>
            </div>
          </div>

          {/* Biomechanical Averages calculated strictly from real tracking data */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="font-semibold text-white text-xs">Observed Kinematics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>Avg Depth Reached</span>
                </div>
                <div className="text-lg font-bold text-white font-mono-numbers">
                  {avgDepth !== null ? `${avgDepth}°` : '—'}
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Avg Rep Tempo</span>
                </div>
                <div className="text-lg font-bold text-white font-mono-numbers">
                  {avgDurationSec !== null ? `${avgDurationSec}s` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Frequent Warnings Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs flex items-center justify-between">
              <span>Frequent Form Warnings</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {sortedWarnings.length === 0 ? '0 detected' : `${sortedWarnings.length} distinct triggers`}
              </span>
            </h4>

            {sortedWarnings.length === 0 ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Flawless session! No biomechanical warnings were triggered.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedWarnings.map(([warningName, count]) => (
                  <div
                    key={warningName}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-slate-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{warningName}</span>
                    </div>
                    <span className="font-mono-numbers text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {count} {count === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors border border-slate-700 min-h-[40px]"
          >
            Continue Session
          </button>
          <button
            onClick={() => {
              onStartNewSession();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Fresh Workout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

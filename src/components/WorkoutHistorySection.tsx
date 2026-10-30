import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingDown,
  Award,
  BookmarkPlus,
  Flame,
} from 'lucide-react';
import { WorkoutHistorySession } from '../types/history';
import { historyService } from '../services/historyService';

interface WorkoutHistorySectionProps {
  exerciseType: 'squat' | 'pushup';
  currentValidReps?: number;
  currentTotalAttempts?: number;
  currentRejectedReps?: number;
  onSaveCurrentSession?: () => void;
  canSaveCurrentSession?: boolean;
}

export const WorkoutHistorySection: React.FC<WorkoutHistorySectionProps> = ({
  exerciseType,
  currentValidReps = 0,
  currentTotalAttempts = 0,
  currentRejectedReps = 0,
  onSaveCurrentSession,
  canSaveCurrentSession = false,
}) => {
  const [sessions, setSessions] = useState<WorkoutHistorySession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const loadSessions = () => {
    if (filterMode === 'current') {
      setSessions(historyService.getSessionsByExercise(exerciseType));
    } else {
      setSessions(historyService.getAllSessions());
    }
  };

  useEffect(() => {
    loadSessions();
    const unsubscribe = historyService.subscribe(loadSessions);
    return () => unsubscribe();
  }, [exerciseType, filterMode]);

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.deleteSession(id);
  };

  const handleClearHistory = () => {
    if (filterMode === 'current') {
      historyService.clearHistory(exerciseType);
    } else {
      historyService.clearHistory();
    }
    setShowClearConfirm(false);
  };

  const handleManualSave = () => {
    if (onSaveCurrentSession) {
      onSaveCurrentSession();
      setSaveToast('Session saved to history!');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Lifetime aggregates for this exercise
  const totalLifetimeValid = sessions.reduce((sum, s) => sum + s.validReps, 0);
  const totalLifetimeAttempts = sessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const avgLifetimeAccuracy =
    totalLifetimeAttempts > 0
      ? Math.round((totalLifetimeValid / totalLifetimeAttempts) * 100)
      : 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <span>{exerciseType === 'squat' ? 'Squat' : 'Push-Up'} Session History</span>
              <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {sessions.length} {sessions.length === 1 ? 'log' : 'logs'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Chronological log with date, time, and kinematics records
            </p>
          </div>
        </div>

        {/* View Filter Toggles */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setFilterMode('current')}
              className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium ${
                filterMode === 'current'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {exerciseType === 'squat' ? 'Squats' : 'Push-Ups'}
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium ${
                filterMode === 'all'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Workouts
            </button>
          </div>

          {sessions.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear Saved History"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Manual Save Alert Banner (If live workout has unsaved reps) */}
      {canSaveCurrentSession && (
        <div className="p-3 bg-sky-500/10 border border-sky-500/25 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-200">
              Active session has <strong className="text-white font-mono-numbers">{currentValidReps}</strong> valid reps ready to record.
            </span>
          </div>
          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shrink-0 shadow-xs"
          >
            Log Current Session
          </button>
        </div>
      )}

      {/* Save Success Toast */}
      {saveToast && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Clear Confirmation Modal / Banner */}
      {showClearConfirm && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Clear all {filterMode === 'current' ? exerciseType : ''} saved history records?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white rounded-md text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleClearHistory}
              className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-md text-xs transition-colors"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {/* Aggregate Stats Strip (if sessions exist) */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Total Reps</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white font-mono-numbers mt-0.5">
              {totalLifetimeValid}
            </div>
          </div>
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-sky-400" />
              <span>Avg Accuracy</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-sky-400 font-mono-numbers mt-0.5">
              {avgLifetimeAccuracy}%
            </div>
          </div>
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>Sessions</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white font-mono-numbers mt-0.5">
              {sessions.length}
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2">
          <History className="w-6 h-6 text-slate-600" />
          <p className="text-slate-400 font-medium">No workout history recorded yet</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Complete a set or turn off the camera to automatically log your results with exact date, time, and form metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1">
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            return (
              <div
                key={session.id}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 transition-all text-xs"
              >
                {/* Session Header: Date & Time */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-200 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      {session.dateFormatted}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 font-mono-numbers text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {session.timeFormatted}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {session.exerciseType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete this record"
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session.id)
                      }
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[11px]"
                    >
                      <span>{isExpanded ? 'Hide Reps' : 'View Reps'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Performance Metrics Row */}
                <div className="grid grid-cols-4 gap-2 pt-2.5 text-center">
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Valid Reps</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono-numbers">
                      {session.validReps}
                      <span className="text-[10px] text-slate-500 font-normal">
                        /{session.totalAttempts}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Accuracy</div>
                    <div className="text-sm sm:text-base font-bold text-sky-400 font-mono-numbers">
                      {session.accuracyPercent}%
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Avg Depth</div>
                    <div className="text-sm sm:text-base font-bold text-white font-mono-numbers">
                      {session.avgDepth !== null ? `${session.avgDepth}°` : '—'}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Duration</div>
                    <div className="text-sm sm:text-base font-bold text-slate-300 font-mono-numbers">
                      {Math.floor(session.durationSeconds / 60)}:
                      {(session.durationSeconds % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>

                {/* Warnings Summary tags */}
                {session.warningsSummary && session.warningsSummary.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">Flags:</span>
                    {session.warningsSummary.map((item) => (
                      <span
                        key={item.issue}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono-numbers"
                      >
                        {item.issue} ({item.count})
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded Rep-by-Rep Breakdown */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                    <h5 className="text-[11px] font-semibold text-slate-300">
                      Repetition Details ({session.reps.length} tracked):
                    </h5>
                    {session.reps.length === 0 ? (
                      <p className="text-[11px] text-slate-500">No individual rep records stored.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {session.reps.map((rep) => (
                          <div
                            key={rep.repNumber}
                            className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                              rep.isValid
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-200'
                                : 'bg-rose-950/20 border-rose-500/20 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {rep.isValid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className="font-semibold font-mono-numbers">
                                Rep #{rep.repNumber}
                              </span>
                              <span className="text-slate-400 font-mono-numbers">
                                Depth: {rep.minAngle}°
                              </span>
                              <span className="text-slate-500 font-mono-numbers">
                                {(rep.durationMs / 1000).toFixed(1)}s
                              </span>
                            </div>
                            <div className="text-[10px] text-right">
                              {rep.isValid ? (
                                <span className="text-emerald-400 font-medium">Valid</span>
                              ) : (
                                <span className="text-rose-400">
                                  {rep.issues[0] || 'Rejected'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Flame,
  Award,
  Download,
} from 'lucide-react';
import { WorkoutHistorySession } from '../types/history';
import { historyService } from '../services/historyService';

interface WorkoutHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeExercise: 'squat' | 'pushup';
}

export const WorkoutHistoryModal: React.FC<WorkoutHistoryModalProps> = ({
  isOpen,
  onClose,
  activeExercise,
}) => {
  const [sessions, setSessions] = useState<WorkoutHistorySession[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'current' | 'all'>('current');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const loadSessions = () => {
    if (selectedFilter === 'current') {
      setSessions(historyService.getSessionsByExercise(activeExercise));
    } else {
      setSessions(historyService.getAllSessions());
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadSessions();
    const unsubscribe = historyService.subscribe(loadSessions);
    return () => unsubscribe();
  }, [isOpen, activeExercise, selectedFilter]);

  if (!isOpen) return null;

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.deleteSession(id);
  };

  const handleClearHistory = () => {
    if (selectedFilter === 'current') {
      historyService.clearHistory(activeExercise);
    } else {
      historyService.clearHistory();
    }
    setShowClearConfirm(false);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `formpulse_workout_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalLifetimeValid = sessions.reduce((sum, s) => sum + s.validReps, 0);
  const totalLifetimeAttempts = sessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const avgLifetimeAccuracy =
    totalLifetimeAttempts > 0
      ? Math.round((totalLifetimeValid / totalLifetimeAttempts) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display">
                Workout History &amp; Results
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Stored records chronologically ordered by date and time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={handleExportJSON}
                title="Export history as JSON"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Summary */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Exercise Filter Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center self-start sm:self-auto">
            <button
              onClick={() => setSelectedFilter('current')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                selectedFilter === 'current'
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeExercise === 'squat' ? 'Squat Sessions' : 'Push-Up Sessions'}
            </button>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                selectedFilter === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Exercises
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono-numbers text-slate-400">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-white">{totalLifetimeValid}</strong> Total Reps
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <strong className="text-white">{avgLifetimeAccuracy}%</strong> Accuracy
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-white">{sessions.length}</strong> Sessions
            </span>
          </div>
        </div>

        {/* Clear Confirmation Prompt */}
        {showClearConfirm && (
          <div className="p-3 bg-rose-500/15 border-b border-rose-500/30 text-xs flex items-center justify-between gap-3 text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to permanently clear saved history?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-white rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1 bg-rose-500 text-white font-semibold rounded text-xs hover:bg-rose-400 transition-colors"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        )}

        {/* Sessions Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {sessions.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <p className="text-slate-300 font-semibold text-sm">No History Records Yet</p>
              <p className="text-slate-400 max-w-sm leading-relaxed">
                Start a {activeExercise === 'squat' ? 'Squat' : 'Push-Up'} workout session. When you
                finish or turn off the camera, your session results will be automatically stored
                here with the exact date, time, and kinematics.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isExpanded = expandedSessionId === session.id;
              return (
                <div
                  key={session.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all text-xs"
                >
                  {/* Card Header: Date & Time */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 text-sky-400" />
                        {session.dateFormatted}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono-numbers text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {session.timeFormatted}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-sky-400 font-mono-numbers">
                        {session.exerciseType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete this record"
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setExpandedSessionId(isExpanded ? null : session.id)
                        }
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-center">
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                      <div className="text-[11px] text-slate-400">Valid Reps</div>
                      <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono-numbers mt-0.5">
                        {session.validReps}{' '}
                        <span className="text-xs text-slate-500 font-normal">
                          / {session.totalAttempts}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                      <div className="text-[11px] text-slate-400">Accuracy</div>
                      <div className="text-lg sm:text-xl font-bold text-sky-400 font-mono-numbers mt-0.5">
                        {session.accuracyPercent}%
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                      <div className="text-[11px] text-slate-400">Avg Depth</div>
                      <div className="text-lg sm:text-xl font-bold text-white font-mono-numbers mt-0.5">
                        {session.avgDepth !== null ? `${session.avgDepth}°` : '—'}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                      <div className="text-[11px] text-slate-400">Duration</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-300 font-mono-numbers mt-0.5">
                        {Math.floor(session.durationSeconds / 60)}:
                        {(session.durationSeconds % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Warnings Summary */}
                  {session.warningsSummary && session.warningsSummary.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500">Flags:</span>
                      {session.warningsSummary.map((item) => (
                        <span
                          key={item.issue}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono-numbers"
                        >
                          {item.issue} ({item.count})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Rep List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                      <h5 className="text-xs font-semibold text-slate-300">
                        Rep-by-Rep Breakdown ({session.reps.length} repetitions):
                      </h5>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {session.reps.map((rep) => (
                          <div
                            key={rep.repNumber}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              rep.isValid
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-200'
                                : 'bg-rose-950/20 border-rose-500/20 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {rep.isValid ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span className="font-bold font-mono-numbers">
                                Rep #{rep.repNumber}
                              </span>
                              <span className="text-slate-400 font-mono-numbers">
                                Depth: {rep.minAngle}°
                              </span>
                              <span className="text-slate-500 font-mono-numbers">
                                {(rep.durationMs / 1000).toFixed(1)}s
                              </span>
                            </div>
                            <div className="text-[11px] text-right">
                              {rep.isValid ? (
                                <span className="text-emerald-400 font-semibold">Valid</span>
                              ) : (
                                <span className="text-rose-400">
                                  {rep.issues[0] || 'Rejected'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          {sessions.length > 0 ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

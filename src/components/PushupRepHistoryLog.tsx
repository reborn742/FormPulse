import React from 'react';
import { PushupRepRecord } from '../types/pushup';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Download,
  Clock,
  TrendingDown,
} from 'lucide-react';

interface PushupRepHistoryLogProps {
  reps: PushupRepRecord[];
}

export const PushupRepHistoryLog: React.FC<PushupRepHistoryLogProps> = ({ reps }) => {
  // Compute summary stats
  const validReps = reps.filter((r) => r.isValid);
  const avgDepth =
    validReps.length > 0
      ? Math.round(validReps.reduce((acc, r) => acc + r.minElbowAngle, 0) / validReps.length)
      : null;

  const avgTempo =
    validReps.length > 0
      ? (validReps.reduce((acc, r) => acc + r.durationMs, 0) / validReps.length / 1000).toFixed(1)
      : null;

  const handleExportCSV = () => {
    if (reps.length === 0) return;

    const headers = [
      'Rep Number',
      'Result',
      'Min Elbow Angle (deg)',
      'Max Plank Deviation (deg)',
      'Duration (sec)',
      'Issues',
    ];

    const rows = reps.map((r) => [
      r.repNumber,
      r.classification,
      Math.round(r.minElbowAngle),
      Math.round(r.maxTrunkDeviation),
      (r.durationMs / 1000).toFixed(2),
      `"${r.issues.join('; ') || 'None (Clean)'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pushup_session_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Repetition Log</h2>
        </div>

        <div className="flex items-center gap-2">
          {reps.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded bg-slate-800 border border-slate-700"
              title="Export Reps to CSV"
            >
              <Download className="w-3 h-3 text-sky-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Micro-Strip */}
      {reps.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-300">
            <TrendingDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Avg Depth:{' '}
              <strong className="text-white font-mono-numbers">
                {avgDepth !== null ? `${avgDepth}°` : '—'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Avg Tempo:{' '}
              <strong className="text-white font-mono-numbers">
                {avgTempo !== null ? `${avgTempo}s` : '—'}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Reps Scrollable List */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {reps.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No push-up repetitions recorded yet.
            <br />
            Assume a plank position to begin!
          </div>
        ) : (
          reps
            .slice()
            .reverse()
            .map((rep) => {
              const isGood = rep.classification === 'valid';
              const isReview = rep.classification === 'needs_review';

              return (
                <div
                  key={rep.id || `rep-${rep.repNumber}-${rep.startTime}`}
                  className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 transition-colors ${
                    isGood
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : isReview
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  {/* Top row: Rep #, Badge, and Elbow Flexion */}
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 font-mono-numbers">
                        #{rep.repNumber}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isGood
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isReview
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isGood ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : isReview ? (
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        <span>
                          {isGood
                            ? 'Valid Rep'
                            : isReview
                            ? 'Needs Review'
                            : 'Invalid Rep'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300 font-mono-numbers text-[11px]">
                      <span>
                        Depth: <strong className="text-white">{Math.round(rep.minElbowAngle)}°</strong>
                      </span>
                      <span className="text-slate-600">·</span>
                      <span>
                        {(rep.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* Issues or Clean message */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-1">
                    <span>
                      {rep.issues.length > 0 ? (
                        <span className="text-rose-400/90 font-medium">
                          {rep.issues.join(' · ')}
                        </span>
                      ) : (
                        <span className="text-emerald-400/90 font-medium">
                          Clean rep · Solid plank &amp; full lockout
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono-numbers">
                      Plank dev: {Math.round(rep.maxTrunkDeviation)}°
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

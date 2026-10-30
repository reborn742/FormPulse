import React, { useState } from 'react';
import { ListFilter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { RepRecord } from '../types/squat';

interface RepHistoryLogProps {
  reps: RepRecord[];
}

export const RepHistoryLog: React.FC<RepHistoryLogProps> = ({ reps }) => {
  const [filter, setFilter] = useState<'all' | 'valid' | 'rejected'>('all');

  const filteredReps = reps.filter((rep) => {
    if (filter === 'valid') return rep.isValid;
    if (filter === 'rejected') return !rep.isValid;
    return true;
  });

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Repetition Log</h3>
          <span className="text-xs text-slate-400 font-mono-numbers">({reps.length})</span>
        </div>

        {/* Filter Tabs conforming to interactive button pattern in frontend-design */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('valid')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'valid'
                ? 'bg-slate-800 text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Valid
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'rejected'
                ? 'bg-slate-800 text-rose-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Incomplete
          </button>
        </div>
      </div>

      {/* Rep List */}
      {filteredReps.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
          No repetitions recorded yet. Perform a squat in front of the camera to begin.
        </div>
      ) : (
        <>
          {/* Mobile Card View (<sm) */}
          <div className="sm:hidden space-y-2">
            {filteredReps.map((rep) => {
              const durationSec = (rep.durationMs / 1000).toFixed(1);
              return (
                <div
                  key={`mobile-${rep.repNumber}-${rep.startTime}`}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col gap-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono-numbers">#{rep.repNumber}</span>
                      {rep.isValid ? (
                        rep.verdict === 'CLEAN' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Warning
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono-numbers text-slate-300">
                      <span>{rep.minKneeAngle}°</span>
                      <span className="text-slate-600 mx-1">·</span>
                      <span className="text-slate-400">{durationSec}s</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="text-slate-500">Depth: </span>
                      <span className={rep.sittingDepth === 'proper' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                        {rep.sittingDepth === 'proper' ? 'Proper (Full)' : 'Half Sitting'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Feet: </span>
                      <span className={rep.footFlat ? 'text-slate-300' : 'text-rose-400 font-medium'}>
                        {rep.footFlat ? 'Flat on floor' : 'Heel Lifted ⚠'}
                      </span>
                    </div>
                  </div>

                  {rep.issues.length > 0 && (
                    <div className="text-[11px] text-amber-400/90 leading-tight">
                      {rep.issues.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table View (>=sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium pb-2">
                  <th className="pb-2.5 font-normal">Rep</th>
                  <th className="pb-2.5 font-normal">Status</th>
                  <th className="pb-2.5 font-normal">Sitting</th>
                  <th className="pb-2.5 font-normal">Foot Plant</th>
                  <th className="pb-2.5 font-normal">Angle</th>
                  <th className="pb-2.5 font-normal">Tempo</th>
                  <th className="pb-2.5 font-normal">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                {filteredReps.map((rep) => {
                  const durationSec = (rep.durationMs / 1000).toFixed(1);

                  return (
                    <tr key={`${rep.repNumber}-${rep.startTime}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-semibold text-white">#{rep.repNumber}</td>
                      <td className="py-2.5">
                        {rep.isValid ? (
                          rep.verdict === 'CLEAN' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-sans font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-sans font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Warning
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-sans font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-sans">
                        <span
                          className={`text-[11px] font-medium ${
                            rep.sittingDepth === 'proper' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {rep.sittingDepth === 'proper' ? 'Proper (Full)' : 'Half Sitting'}
                        </span>
                      </td>
                      <td className="py-2.5 font-sans">
                        <span
                          className={`text-[11px] font-medium ${
                            rep.footFlat ? 'text-slate-300' : 'text-rose-400'
                          }`}
                        >
                          {rep.footFlat ? 'Flat on floor' : 'Heel Lifted ⚠'}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-200">{rep.minKneeAngle}°</td>
                      <td className="py-2.5 text-slate-400">{durationSec}s</td>
                      <td className="py-2.5 font-sans text-slate-400 text-[11px]">
                        {rep.issues.length > 0 ? (
                          <span className={rep.isValid ? 'text-amber-400/90' : 'text-rose-400/90'}>
                            {rep.issues.join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-500">Solid form · Flat feet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

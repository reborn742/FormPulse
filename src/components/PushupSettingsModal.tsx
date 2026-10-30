import React from 'react';
import { X, Sliders, Volume2, ShieldCheck, RotateCcw } from 'lucide-react';
import { PushupConfig } from '../types/pushup';
import { DEFAULT_PUSHUP_CONFIG, PUSHUP_DEPTH_PRESETS } from '../config/pushupThresholds';

interface PushupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PushupConfig;
  onSaveConfig: (newConfig: Partial<PushupConfig>) => void;
}

export const PushupSettingsModal: React.FC<PushupSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm sm:text-base font-bold text-white font-display">Push-Up Detection Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-xs">
          {/* Depth Target Presets */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Bottom Elbow Flexion Goal
            </label>
            <p className="text-slate-400 text-[11px] mb-3">
              Interior elbow angle at the bottom of the rep. Lower angles indicate a deeper push-up.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PUSHUP_DEPTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSaveConfig({ targetBottomElbowAngle: preset.value })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    config.targetBottomElbowAngle === preset.value
                      ? 'bg-sky-500/15 border-sky-500/60 text-white shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{preset.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>

            {/* Fine-tuning Slider */}
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min="75"
                max="105"
                step="1"
                value={config.targetBottomElbowAngle}
                onChange={(e) => onSaveConfig({ targetBottomElbowAngle: Number(e.target.value) })}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono-numbers font-semibold text-sky-400 text-xs shrink-0 w-10 text-right">
                {config.targetBottomElbowAngle}°
              </span>
            </div>
          </div>

          {/* Top Lockout Angle */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Top Lockout Requirement</label>
              <span className="font-mono-numbers text-sky-400 font-semibold">
                {config.topElbowExtensionAngle}°
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Elbow extension angle required to return to the top plank position and complete the rep.
            </p>
            <input
              type="range"
              min="145"
              max="170"
              step="1"
              value={config.topElbowExtensionAngle}
              onChange={(e) => onSaveConfig({ topElbowExtensionAngle: Number(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Max Trunk Deviation / Hip Sag */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Max Plank Line Deviation (Spine Alignment)</label>
              <span className="font-mono-numbers text-sky-400 font-semibold">
                {config.maxTrunkDeviationAngle}°
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Maximum allowable deviation from a straight shoulder-hip-ankle line. Flags hip sagging or excessive piking.
            </p>
            <input
              type="range"
              min="10"
              max="30"
              step="1"
              value={config.maxTrunkDeviationAngle}
              onChange={(e) => onSaveConfig({ maxTrunkDeviationAngle: Number(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Landmark Confidence */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">MoveNet Confidence Filter</label>
              <span className="font-mono-numbers text-sky-400 font-semibold">
                {(config.minLandmarkConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Rejects low-confidence landmarks to eliminate jitter.
            </p>
            <input
              type="range"
              min="0.20"
              max="0.65"
              step="0.05"
              value={config.minLandmarkConfidence}
              onChange={(e) => onSaveConfig({ minLandmarkConfidence: Number(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Audio & Strict Toggles */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <label className="text-slate-300 font-semibold">Audio &amp; Enforcement Toggles</label>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <div className="text-white font-medium">Synthesized Sound Effects</div>
                <div className="text-[11px] text-slate-400">Audio chimes on valid push-ups and warning cues</div>
              </div>
              <input
                type="checkbox"
                checked={config.enableSoundEffects}
                onChange={(e) => onSaveConfig({ enableSoundEffects: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <div className="text-white font-medium">Enforce Strict Top Lockout</div>
                <div className="text-[11px] text-slate-400">Rejects rep if user begins next descent before fully locking out</div>
              </div>
              <input
                type="checkbox"
                checked={config.requireStrictLockout}
                onChange={(e) => onSaveConfig({ requireStrictLockout: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <div className="text-white font-medium">Voice Coach Utterances</div>
                <div className="text-[11px] text-slate-400">Speech feedback for rep counts and form warnings</div>
              </div>
              <input
                type="checkbox"
                checked={config.enableVoiceCoach}
                onChange={(e) => onSaveConfig({ enableVoiceCoach: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={() => onSaveConfig(DEFAULT_PUSHUP_CONFIG)}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

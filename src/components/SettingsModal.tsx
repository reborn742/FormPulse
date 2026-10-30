import React from 'react';
import { X, Sliders, Volume2, Eye, ShieldCheck, RotateCcw } from 'lucide-react';
import { SquatConfig, CameraViewMode, ActiveSide } from '../types/squat';
import { DEFAULT_SQUAT_CONFIG, DEPTH_PRESETS } from '../config/thresholds';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SquatConfig;
  onSaveConfig: (newConfig: Partial<SquatConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
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
            <h2 className="text-sm sm:text-base font-bold text-white font-display">Squat Detection Settings</h2>
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
              Target Squat Depth Threshold
            </label>
            <p className="text-slate-400 text-[11px] mb-3">
              Knee interior flexion angle at bottom. Smaller angles require deeper squats.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEPTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSaveConfig({ targetDepthAngle: preset.value })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    config.targetDepthAngle === preset.value
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
                min="70"
                max="125"
                step="1"
                value={config.targetDepthAngle}
                onChange={(e) => onSaveConfig({ targetDepthAngle: Number(e.target.value) })}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono-numbers font-semibold text-sky-400 text-xs shrink-0 w-10 text-right">
                {config.targetDepthAngle}°
              </span>
            </div>
          </div>

          {/* Camera View Mode */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Eye className="w-4 h-4 text-sky-400" />
              <label className="text-slate-300 font-semibold">Camera Angle Configuration</label>
            </div>
            <p className="text-slate-400 text-[11px] mb-3">
              Side view tracks depth and forward lean. Front view evaluates knee caving (valgus).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'side', 'front'] as CameraViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSaveConfig({ viewMode: mode })}
                  className={`p-2 rounded-xl border text-center capitalize transition-all ${
                    config.viewMode === mode
                      ? 'bg-sky-500/15 border-sky-500/60 text-sky-300 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'auto' ? 'Auto-Detect' : `${mode} View`}
                </button>
              ))}
            </div>
          </div>

          {/* Active Side in Side View */}
          <div className="pt-4 border-t border-slate-800/80">
            <label className="block text-slate-300 font-semibold mb-1.5">
              Tracked Body Side
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'left', 'right'] as ActiveSide[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => onSaveConfig({ activeSide: side })}
                  className={`p-2 rounded-xl border text-center capitalize transition-all ${
                    config.activeSide === side
                      ? 'bg-sky-500/15 border-sky-500/60 text-sky-300 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {side === 'auto' ? 'Highest Confidence' : `${side} Side`}
                </button>
              ))}
            </div>
          </div>

          {/* Max Torso Lean Threshold */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Max Torso Forward Lean</label>
              <span className="font-mono-numbers text-sky-400 font-semibold">
                {config.maxTorsoLeanAngle}°
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Angle from vertical axis. Exceeding triggers forward lean warning.
            </p>
            <input
              type="range"
              min="30"
              max="60"
              step="1"
              value={config.maxTorsoLeanAngle}
              onChange={(e) => onSaveConfig({ maxTorsoLeanAngle: Number(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Min Landmark Confidence */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">MoveNet Confidence Filter</label>
              <span className="font-mono-numbers text-sky-400 font-semibold">
                {(config.minLandmarkConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">
              Discards keypoints below this confidence to eliminate false skeleton jitter.
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

          {/* Audio Feedback Toggles */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <label className="text-slate-300 font-semibold">Audio &amp; Voice Feedback</label>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <div className="text-white font-medium">Synthesized Sound Effects</div>
                <div className="text-[11px] text-slate-400">Audio chimes on valid reps and warning blips</div>
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
                <div className="text-white font-medium">Enforce Flat Feet on Floor</div>
                <div className="text-[11px] text-slate-400">Flags warning if heels lift or user rises onto toes</div>
              </div>
              <input
                type="checkbox"
                checked={config.enforceFootFlat}
                onChange={(e) => onSaveConfig({ enforceFootFlat: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <div className="text-white font-medium">Voice Coach Utterances</div>
                <div className="text-[11px] text-slate-400">Speech cues (Rep count, depth, posture reminders)</div>
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
            onClick={() => onSaveConfig(DEFAULT_SQUAT_CONFIG)}
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

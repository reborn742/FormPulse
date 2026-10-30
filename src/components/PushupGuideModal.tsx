import React from 'react';
import { X, BookOpen, AlertCircle, Check, Camera, Compass } from 'lucide-react';

interface PushupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushupGuideModal: React.FC<PushupGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm sm:text-base font-bold text-white font-display">Push-Up Camera &amp; Form Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Camera Setup */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white font-semibold mb-2">
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Optimal Camera Placement for Push-Ups</span>
            </div>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Place your device at <strong>ground or near-ground level (0.3–0.6m)</strong>, roughly <strong>6 to 8 feet (2–2.5m)</strong> away.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ensure your entire plank length—head, shoulders, hips, knees, and ankles—is clearly visible in frame.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Avoid backlighting from windows behind you so your silhouette remains sharp for MoveNet.</span>
              </li>
            </ul>
          </div>

          {/* Angles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Side View (Sagittal) · Recommended</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Best view for measuring true chest depth (elbows ≤90°), plank line straightness, hip sag vs. piking, and knee lock.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>45° Oblique View</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Allows observing hand placement under shoulders as well as depth and plank line simultaneously.
              </p>
            </div>
          </div>

          {/* 6 Form Elements Checked */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <h4 className="font-semibold text-white">6 Evaluated Biomechanical Points</h4>
            <div className="space-y-1.5 text-slate-400 text-[11px]">
              <div><strong>1. Hands &amp; Wrists:</strong> Aligned beneath or slightly outside shoulders; symmetry.</div>
              <div><strong>2. Elbow Mechanics:</strong> Flexion down to 90° and full lockout (≥158°) at top.</div>
              <div><strong>3. Chest &amp; Depth:</strong> Torso lowered sufficiently without cutting the movement short.</div>
              <div><strong>4. Core Alignment:</strong> Straight line from shoulders through hips to feet; zero hip sag or pike.</div>
              <div><strong>5. Leg Position:</strong> Knees fully extended and off the floor.</div>
              <div><strong>6. Neck &amp; Spine:</strong> Neutral head alignment; no dropped chin toward floor.</div>
            </div>
          </div>

          {/* Technical Limitations Notice */}
          <div className="p-4 bg-sky-950/30 border border-sky-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300">
              <strong className="text-white block mb-0.5">2D Pose Estimation Transparency:</strong>
              MoveNet tracks 2D pixel coordinates. If your legs or feet are cut off by the edge of your camera frame, the app marks them as &ldquo;Unable to assess&rdquo; rather than guessing.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

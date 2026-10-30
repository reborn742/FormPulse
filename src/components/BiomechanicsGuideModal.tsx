import React from 'react';
import { X, BookOpen, AlertCircle, Check, Camera, Compass } from 'lucide-react';

interface BiomechanicsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BiomechanicsGuideModal: React.FC<BiomechanicsGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm sm:text-base font-bold text-white font-display">Squat Form &amp; Camera Guide</h2>
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
              <span>Optimal Camera Positioning</span>
            </div>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Position device roughly <strong>6 to 9 feet (2–3 meters)</strong> away at hip level.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ensure your entire body—from head to ankles—is unobstructed in the frame.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Use clear, direct lighting without severe backlighting from a bright window.</span>
              </li>
            </ul>
          </div>

          {/* View Modes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Side View (Sagittal)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Recommended for depth measurement (femur parallel / below parallel) and forward trunk lean analysis.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Front View (Frontal)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Recommended for tracking knee collapse (valgus) and stance symmetry across left and right legs.
              </p>
            </div>
          </div>

          {/* Technical Limitations Notice */}
          <div className="p-4 bg-sky-950/30 border border-sky-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300">
              <strong className="text-white block mb-0.5">2D Vision Biomechanics Note:</strong>
              Single 2D monocular cameras cannot measure 3D rotational joint torque or replace a qualified biomechanist. Feedback is based strictly on observable geometric landmark angles in your selected plane.
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

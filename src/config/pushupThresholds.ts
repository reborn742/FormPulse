import { PushupConfig } from '../types/pushup';

/**
 * Centrally documented thresholds for push-up tracking and biomechanical form analysis.
 * All angles are measured in degrees (°).
 */
export const DEFAULT_PUSHUP_CONFIG: PushupConfig = {
  // Target elbow angle at bottom:
  // In a standard push-up in 2D webcam perspective, upper arms reach horizontal (~90°-95° elbow flexion).
  // 95° provides a comfortable, anatomically accurate standard without requiring joint hyperextension.
  targetBottomElbowAngle: 95,

  // Lockout angle required at top position:
  // 150° ensures reliable top detection in 2D video without exhausting the user trying to reach 160°+.
  topElbowExtensionAngle: 150,

  // Descent initiation:
  // When elbows bend below 145°, state machine transitions from TOP to DESCENDING.
  descentStartAngle: 145,

  // Core & Trunk Plank straightness:
  // Measured as angle across Shoulder - Hip - Ankle (or Knee if ankle obscured).
  // 180° = dead straight plank line.
  // 20° threshold accounts for natural lumbar spine curvature while catching real hip sag or pike.
  maxTrunkDeviationAngle: 20,

  // Minimum MoveNet landmark confidence
  minLandmarkConfidence: 0.35,

  // Camera view angle preference
  // 'side' or oblique-side is optimal for depth and plank line.
  viewMode: 'auto',

  // Active arm side
  activeSide: 'auto',

  // Smoothing factor (EMA)
  smoothingFactor: 0.65,

  // Audio feedback
  enableSoundEffects: true,
  enableVoiceCoach: true,

  // Overlay mode for viewing real body: 'minimal' allows clean view of muscles & movement
  overlayMode: 'minimal',
};

export const PUSHUP_DEPTH_PRESETS = [
  { label: 'Chest to Floor (85°)', value: 85, desc: 'Deep military/strict push-up' },
  { label: 'Standard (95°)', value: 95, desc: 'Elbows at 90°-95° (Standard)' },
  { label: 'Moderate (105°)', value: 105, desc: 'Beginner / partial depth' },
];

export const PUSHUP_STATE_MACHINE_CONSTANTS = {
  // Minimum time in ms required for a valid push-up rep (prevents rapid glitch counts)
  MIN_REP_DURATION_MS: 650,

  // Maximum time in ms before an incomplete rep times out
  MAX_REP_DURATION_MS: 12000,

  // Cooldown in ms after completing a rep before starting the next rep
  REP_COOLDOWN_MS: 300,

  // Minimum frames of lost tracking before entering tracking-lost state
  TRACKING_LOSS_FRAMES_THRESHOLD: 12,

  // Knee extension angle for straight legs in plank:
  // Under 145° indicates visible knee bending or resting on floor
  MIN_KNEE_EXTENSION_ANGLE: 145,

  // Hand placement offset tolerance relative to shoulder:
  MAX_WRIST_SHOULDER_FORWARD_DELTA_RATIO: 0.38,

  // Minimum elbow flexion range-of-motion required to count a valid rep (prevents micro-bobs)
  MIN_REQUIRED_ELBOW_ROM_DEG: 30,

  // Minimum consecutive frames of form deviation required to flag persistent defects
  MIN_PERSISTENT_FAULT_FRAMES: 3,
};

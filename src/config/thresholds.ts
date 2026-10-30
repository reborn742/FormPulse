import { SquatConfig } from '../types/squat';

/**
 * Centrally documented thresholds for squat tracking and biomechanical form analysis.
 * All angles are measured in degrees (°).
 */
export const DEFAULT_SQUAT_CONFIG: SquatConfig = {
  // Knee depth threshold:
  // At standing, knee angle is ~170°-180°.
  // In a parallel squat, femur is horizontal, yielding ~85°-95° knee interior angle.
  // 95° allows typical gym parallel squats without punishing mobility limitations.
  targetDepthAngle: 95,

  // Standing threshold:
  // Knee angle must return to >= 162° to complete the repetition and enter STANDING.
  standingAngleThreshold: 162,

  // Descent initiation:
  // When knee angle drops below 150°, state machine moves from STANDING to DESCENDING.
  descentStartAngle: 150,

  // Maximum safe torso forward lean (side view):
  // Angle of the trunk (line between shoulder and hip) measured from the vertical axis.
  // 0° = completely vertical torso.
  // > 45° = excessive forward lean indicating low back strain or hip hinge collapse.
  maxTorsoLeanAngle: 45,

  // Minimum MoveNet landmark confidence score (0.0 to 1.0):
  // Frames with key landmark confidences below 0.35 are discarded to avoid false joints.
  minLandmarkConfidence: 0.35,

  // View mode preference:
  // 'side' evaluates depth and torso angle.
  // 'front' evaluates stance symmetry and knee inward cave (valgus).
  // 'auto' detects viewing angle based on shoulder/hip width ratios.
  viewMode: 'auto',

  // Side view preference:
  // 'auto' automatically selects the side with higher landmark confidence.
  activeSide: 'auto',

  // Landmark smoothing factor (Exponential Moving Average):
  // new_val = alpha * current + (1 - alpha) * previous
  // 0.65 provides quick response with stable jitter elimination.
  smoothingFactor: 0.65,

  // Foot flat on floor enforcement:
  // Detects if user lifts heels or rises onto toes during descent/bottom
  enforceFootFlat: true,

  // Audio feedback:
  enableSoundEffects: true,
  enableVoiceCoach: true,
};

export const DEPTH_PRESETS = [
  { label: 'Deep (80°)', value: 80, desc: 'Below parallel / Full Olympic depth' },
  { label: 'Parallel (95°)', value: 95, desc: 'Femur parallel to floor (Proper Sitting)' },
  { label: 'Quarter / Power (115°)', value: 115, desc: 'Half-sitting / Powerlifting baseline' },
];

export const STATE_MACHINE_CONSTANTS = {
  // Minimum time in ms required for a valid repetition (prevents rapid camera glitch counts)
  MIN_REP_DURATION_MS: 700,

  // Maximum time in ms before an incomplete rep times out or resets if abandoned
  MAX_REP_DURATION_MS: 12000,

  // Minimum frames of lost tracking before entering tracking-lost state
  TRACKING_LOSS_FRAMES_THRESHOLD: 12,

  // Cooldown in ms after completing a rep before starting the next rep
  REP_COOLDOWN_MS: 400,

  // Knee valgus threshold in front view:
  // Ratio of knee width to ankle width.
  // When knees cave inwards significantly (< 0.85 of ankle distance), valgus warning is triggered.
  KNEE_VALGUS_RATIO_WARNING: 0.82,

  // Heel elevation threshold (foot flat verification):
  // When ankle Y rises above standing baseline by > 7% of shank length, heel lift is detected.
  HEEL_LIFT_RATIO_WARNING: 0.07,

  // Proper sitting vs half sitting ratio:
  // In image coordinates (Y increases downwards), femur is parallel when (hip.y - knee.y) / shankLength >= -0.06
  // When hip is significantly higher than knee ((knee.y - hip.y) / shankLength > 0.18) with knee angle > 100°,
  // it is identified as "half sitting".
  HALF_SITTING_THRESHOLD_ANGLE: 105,
};

import { Keypoint } from '../types/squat';

export const MOVENET_KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

// Skeletal pairs to connect with lines
export const SKELETON_CONNECTIONS: [number, number][] = [
  // Face
  [MOVENET_KEYPOINTS.NOSE, MOVENET_KEYPOINTS.LEFT_EYE],
  [MOVENET_KEYPOINTS.NOSE, MOVENET_KEYPOINTS.RIGHT_EYE],
  [MOVENET_KEYPOINTS.LEFT_EYE, MOVENET_KEYPOINTS.LEFT_EAR],
  [MOVENET_KEYPOINTS.RIGHT_EYE, MOVENET_KEYPOINTS.RIGHT_EAR],
  // Shoulders & Arms
  [MOVENET_KEYPOINTS.LEFT_SHOULDER, MOVENET_KEYPOINTS.RIGHT_SHOULDER],
  [MOVENET_KEYPOINTS.LEFT_SHOULDER, MOVENET_KEYPOINTS.LEFT_ELBOW],
  [MOVENET_KEYPOINTS.LEFT_ELBOW, MOVENET_KEYPOINTS.LEFT_WRIST],
  [MOVENET_KEYPOINTS.RIGHT_SHOULDER, MOVENET_KEYPOINTS.RIGHT_ELBOW],
  [MOVENET_KEYPOINTS.RIGHT_ELBOW, MOVENET_KEYPOINTS.RIGHT_WRIST],
  // Torso
  [MOVENET_KEYPOINTS.LEFT_SHOULDER, MOVENET_KEYPOINTS.LEFT_HIP],
  [MOVENET_KEYPOINTS.RIGHT_SHOULDER, MOVENET_KEYPOINTS.RIGHT_HIP],
  [MOVENET_KEYPOINTS.LEFT_HIP, MOVENET_KEYPOINTS.RIGHT_HIP],
  // Legs
  [MOVENET_KEYPOINTS.LEFT_HIP, MOVENET_KEYPOINTS.LEFT_KNEE],
  [MOVENET_KEYPOINTS.LEFT_KNEE, MOVENET_KEYPOINTS.LEFT_ANKLE],
  [MOVENET_KEYPOINTS.RIGHT_HIP, MOVENET_KEYPOINTS.RIGHT_KNEE],
  [MOVENET_KEYPOINTS.RIGHT_KNEE, MOVENET_KEYPOINTS.RIGHT_ANKLE],
];

/**
 * Calculates 2D Euclidean distance between two points.
 */
export function distance2D(p1: Keypoint, p2: Keypoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the interior angle (in degrees) at joint B given points A, B, C.
 * For example, for knee angle: A = Hip, B = Knee, C = Ankle.
 * Returns a value between 0 and 180 degrees.
 */
export function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 180;

  let cosAngle = dot / (mag1 * mag2);
  // Clamp to avoid precision NaN
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  const radians = Math.acos(cosAngle);
  return (radians * 180) / Math.PI;
}

/**
 * Calculates torso forward lean angle from the vertical axis in degrees.
 * 0 degrees = upright vertical trunk.
 * 90 degrees = completely horizontal trunk.
 */
export function calculateTorsoLean(shoulder: Keypoint, hip: Keypoint): number {
  // Vector from hip to shoulder
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;

  // In screen coordinates, y increases downwards, so hip.y > shoulder.y when upright (dy is negative)
  // Vertical line straight UP is dx = 0, dy = -1
  const trunkLen = Math.sqrt(dx * dx + dy * dy);
  if (trunkLen === 0) return 0;

  // Dot product with (0, -1) is -dy
  const cosAngle = Math.max(-1, Math.min(1, -dy / trunkLen));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Calculates knee valgus ratio in front view.
 * Compares knee separation to ankle separation.
 * A ratio < 0.80 suggests knees are collapsing inwards relative to foot placement.
 */
export function calculateKneeValgusRatio(
  leftKnee: Keypoint,
  rightKnee: Keypoint,
  leftAnkle: Keypoint,
  rightAnkle: Keypoint
): number | null {
  const kneeDist = Math.abs(leftKnee.x - rightKnee.x);
  const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);

  if (ankleDist < 20) {
    // Feet too close together to reliably assess
    return null;
  }

  return kneeDist / ankleDist;
}

/**
 * Automatically infers if user is in 'front' view or 'side' view.
 * Compares horizontal shoulder/hip width to torso vertical height.
 */
export function inferViewMode(keypoints: Keypoint[], minConfidence: number): 'side' | 'front' {
  const ls = keypoints[MOVENET_KEYPOINTS.LEFT_SHOULDER];
  const rs = keypoints[MOVENET_KEYPOINTS.RIGHT_SHOULDER];
  const lh = keypoints[MOVENET_KEYPOINTS.LEFT_HIP];
  const rh = keypoints[MOVENET_KEYPOINTS.RIGHT_HIP];

  const lsValid = (ls?.score ?? 0) >= minConfidence;
  const rsValid = (rs?.score ?? 0) >= minConfidence;
  const lhValid = (lh?.score ?? 0) >= minConfidence;
  const rhValid = (rh?.score ?? 0) >= minConfidence;

  // If one side has high confidence and other side is low confidence -> Profile / Side view
  const leftConfidence = ((ls?.score ?? 0) + (lh?.score ?? 0)) / 2;
  const rightConfidence = ((rs?.score ?? 0) + (rh?.score ?? 0)) / 2;

  if (Math.abs(leftConfidence - rightConfidence) > 0.3) {
    return 'side';
  }

  if (lsValid && rsValid && lhValid && rhValid) {
    const shoulderWidth = Math.abs(ls.x - rs.x);
    const hipWidth = Math.abs(lh.x - rh.x);
    const torsoHeight = (Math.abs(ls.y - lh.y) + Math.abs(rs.y - rh.y)) / 2;

    if (torsoHeight > 0) {
      const shoulderRatio = shoulderWidth / torsoHeight;
      const hipRatio = hipWidth / torsoHeight;

      // In side view, both shoulders and hips align closely horizontally
      if (shoulderRatio < 0.32 || hipRatio < 0.22) {
        return 'side';
      }
    }
  }

  return 'front';
}

/**
 * Determines which side (left or right) has higher landmark tracking confidence.
 */
export function pickBestSide(keypoints: Keypoint[]): 'left' | 'right' {
  const leftScore =
    ((keypoints[MOVENET_KEYPOINTS.LEFT_SHOULDER]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.LEFT_HIP]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.LEFT_KNEE]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.LEFT_ANKLE]?.score ?? 0)) /
    4;

  const rightScore =
    ((keypoints[MOVENET_KEYPOINTS.RIGHT_SHOULDER]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.RIGHT_HIP]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.RIGHT_KNEE]?.score ?? 0) +
      (keypoints[MOVENET_KEYPOINTS.RIGHT_ANKLE]?.score ?? 0)) /
    4;

  return leftScore >= rightScore ? 'left' : 'right';
}

/**
 * Smooths keypoint positions using Exponential Moving Average (EMA).
 */
export function smoothKeypoints(
  prevKeypoints: Keypoint[] | null,
  currKeypoints: Keypoint[],
  alpha: number = 0.65
): Keypoint[] {
  if (!prevKeypoints || prevKeypoints.length !== currKeypoints.length) {
    return currKeypoints;
  }

  return currKeypoints.map((curr, idx) => {
    const prev = prevKeypoints[idx];
    if (!prev) return curr;

    return {
      x: alpha * curr.x + (1 - alpha) * prev.x,
      y: alpha * curr.y + (1 - alpha) * prev.y,
      score: curr.score,
      name: curr.name,
    };
  });
}

/**
 * Checks whether the foot/heel remains flat on the floor.
 * Compares current ankle vertical position against the calibrated standing baseline.
 * When a user lifts their heel onto their toes, ankle.y moves UP (decreases in image space).
 */
export function calculateFootFlatness(
  ankle: Keypoint,
  baselineAnkleY: number | null,
  shankLength: number,
  thresholdRatio: number = 0.07
): { isFlat: boolean; elevationDelta: number; elevationRatio: number } {
  if (baselineAnkleY === null || shankLength <= 10) {
    return { isFlat: true, elevationDelta: 0, elevationRatio: 0 };
  }

  // In screen space, y increases downwards.
  // If heel lifts, ankle moves upwards -> ankle.y < baselineAnkleY -> deltaY > 0
  const deltaY = baselineAnkleY - ankle.y;
  const elevationRatio = deltaY / shankLength;

  return {
    isFlat: elevationRatio <= thresholdRatio,
    elevationDelta: Math.round(deltaY),
    elevationRatio,
  };
}

/**
 * Evaluates the sitting position:
 * - Proper Sitting: Femur is parallel or below parallel to the floor (hip.y >= knee.y or knee angle <= targetDepthAngle)
 * - Half Sitting: Knee angle is between ~100° and 140° with hips still hanging above the knee
 */
export function evaluateSittingPosition(
  hip: Keypoint,
  knee: Keypoint,
  shankLength: number,
  kneeAngle: number,
  targetDepthAngle: number
): {
  status: 'upright' | 'half_sitting' | 'parallel_sitting' | 'deep_sitting';
  hipKneeRatio: number; // positive = hip level with or below knee (proper sitting)
} {
  if (shankLength <= 10) {
    return {
      status: kneeAngle <= targetDepthAngle ? 'parallel_sitting' : 'half_sitting',
      hipKneeRatio: 0,
    };
  }

  // In image coordinates, y increases downwards.
  // Hip below knee means hip.y >= knee.y (delta >= 0)
  const hipKneeDelta = hip.y - knee.y;
  const hipKneeRatio = hipKneeDelta / shankLength;

  if (kneeAngle >= 150) {
    return { status: 'upright', hipKneeRatio };
  }

  if (kneeAngle <= 85 || hipKneeRatio >= 0.04) {
    return { status: 'deep_sitting', hipKneeRatio };
  }

  // Parallel sitting: either knee angle hit target depth (e.g. <= 95°) OR hip reached within 5% of knee level
  if (kneeAngle <= targetDepthAngle || hipKneeRatio >= -0.06) {
    return { status: 'parallel_sitting', hipKneeRatio };
  }

  // Otherwise, user is descending or stopping in half-sitting / quarter-squat
  return { status: 'half_sitting', hipKneeRatio };
}


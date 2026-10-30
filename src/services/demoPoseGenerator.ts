import { Keypoint } from '../types/squat';

export type DemoMotionType = 'perfect_squat' | 'half_squat' | 'heel_lift_squat' | 'excessive_lean' | 'pause';

/**
 * Procedural biomechanics motion generator for automated verification and test mode.
 * Generates exact MoveNet-compliant 17 keypoints matching human kinematic geometry.
 */
export class DemoPoseGenerator {
  private progress = 0; // 0 (standing) -> 1 (bottom) -> 2 (standing)
  private speed = 0.015; // smooth speed ~2.2s per squat
  private motionType: DemoMotionType = 'perfect_squat';
  private canvasWidth = 640;
  private canvasHeight = 480;

  public setMotionType(type: DemoMotionType) {
    this.motionType = type;
    this.progress = 0;
  }

  public getMotionType(): DemoMotionType {
    return this.motionType;
  }

  public setDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Advances one frame and generates 17 MoveNet keypoints.
   */
  public nextFrame(): Keypoint[] {
    this.progress += this.speed;
    if (this.progress > 2) {
      this.progress = 0;
    }

    // Kinematic squat depth factor: 0 at upright standing, 1 at bottom
    let depthFactor = 0;
    if (this.progress <= 1) {
      // Descending (0 -> 1)
      depthFactor = Math.sin((this.progress * Math.PI) / 2);
    } else {
      // Ascending (1 -> 0)
      depthFactor = Math.cos(((this.progress - 1) * Math.PI) / 2);
    }

    // Motion variations
    let maxKneeFlexion = 1.0; // Target ~88 deg for full depth
    let forwardLeanMultiplier = 0.35; // standard ~25 deg lean
    let heelLiftOffset = 0;

    if (this.motionType === 'half_squat') {
      maxKneeFlexion = 0.52; // Only reaches ~122 deg (half sitting, incomplete)
    } else if (this.motionType === 'heel_lift_squat') {
      maxKneeFlexion = 0.95;
      heelLiftOffset = depthFactor * 26; // Ankle joint elevates 26px off floor
    } else if (this.motionType === 'excessive_lean') {
      forwardLeanMultiplier = 0.88; // Excessive ~54 deg lean
    }

    const currentDepth = depthFactor * maxKneeFlexion;

    // Base coordinates (side profile view centered)
    const centerX = this.canvasWidth * 0.48;
    const groundY = this.canvasHeight * 0.88;

    // Feet planted on the ground, or heel lifted onto toes
    const ankleY = groundY - heelLiftOffset;
    const ankleX = centerX;

    // Knee flexes forward slightly during descent
    const kneeShiftX = currentDepth * 38;
    const kneeY = groundY - 145 + currentDepth * 35;
    const kneeX = centerX + kneeShiftX;

    // Hip sinks back and down
    const hipShiftX = -(currentDepth * 85);
    const hipY = groundY - 295 + currentDepth * 145;
    const hipX = centerX + hipShiftX;

    // Shoulder shifts forward according to trunk lean
    const torsoLength = 140;
    const leanDeg = 12 + currentDepth * 48 * forwardLeanMultiplier;
    const leanRad = leanDeg * (Math.PI / 180);
    const shoulderX = hipX + Math.sin(leanRad) * torsoLength;
    const shoulderY = hipY - Math.cos(leanRad) * torsoLength;

    // Head / Eye / Nose
    const headX = shoulderX + 15;
    const headY = shoulderY - 38;

    // Arms extended forward for balance
    const elbowX = shoulderX + 45;
    const elbowY = shoulderY + 15;
    const wristX = elbowX + 45;
    const wristY = elbowY - 10;

    const baseScore = 0.88;

    // Map 17 MoveNet keypoints
    const keypoints: Keypoint[] = [
      { x: headX, y: headY, score: baseScore, name: 'nose' },
      { x: headX - 5, y: headY - 4, score: baseScore, name: 'left_eye' },
      { x: headX + 5, y: headY - 4, score: baseScore, name: 'right_eye' },
      { x: headX - 10, y: headY, score: baseScore, name: 'left_ear' },
      { x: headX + 10, y: headY, score: baseScore, name: 'right_ear' },
      // Left side (facing camera)
      { x: shoulderX, y: shoulderY, score: baseScore, name: 'left_shoulder' },
      { x: shoulderX - 8, y: shoulderY - 4, score: 0.65, name: 'right_shoulder' },
      { x: elbowX, y: elbowY, score: baseScore, name: 'left_elbow' },
      { x: elbowX - 8, y: elbowY, score: 0.65, name: 'right_elbow' },
      { x: wristX, y: wristY, score: baseScore, name: 'left_wrist' },
      { x: wristX - 8, y: wristY, score: 0.65, name: 'right_wrist' },
      // Hips
      { x: hipX, y: hipY, score: baseScore, name: 'left_hip' },
      { x: hipX - 10, y: hipY - 2, score: 0.7, name: 'right_hip' },
      // Knees
      { x: kneeX, y: kneeY, score: baseScore, name: 'left_knee' },
      { x: kneeX - 8, y: kneeY - 2, score: 0.7, name: 'right_knee' },
      // Ankles
      { x: ankleX, y: ankleY, score: baseScore, name: 'left_ankle' },
      { x: ankleX - 8, y: ankleY, score: 0.7, name: 'right_ankle' },
    ];

    return keypoints;
  }
}

import { Keypoint } from '../types/squat';

export type DemoPushupMotionType =
  | 'perfect_pushup'
  | 'shallow_pushup'
  | 'hip_sag_pushup'
  | 'knee_drop_pushup';

/**
 * Procedural biomechanics push-up motion generator for verification and testing.
 * Generates exact MoveNet-compliant 17 keypoints matching horizontal human plank geometry.
 */
export class DemoPushupGenerator {
  private progress = 0; // 0 (top) -> 1 (bottom) -> 2 (top)
  private speed = 0.016; // ~2.1s per push-up
  private motionType: DemoPushupMotionType = 'perfect_pushup';
  private canvasWidth = 640;
  private canvasHeight = 480;

  public setMotionType(type: DemoPushupMotionType) {
    this.motionType = type;
    this.progress = 0;
  }

  public getMotionType(): DemoPushupMotionType {
    return this.motionType;
  }

  public setDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public nextFrame(): Keypoint[] {
    this.progress += this.speed;
    if (this.progress > 2) {
      this.progress = 0;
    }

    // Push-up depth factor: 0 at top lockout, 1 at bottom chest-to-floor
    let depthFactor = 0;
    if (this.progress <= 1) {
      depthFactor = Math.sin((this.progress * Math.PI) / 2);
    } else {
      depthFactor = Math.cos(((this.progress - 1) * Math.PI) / 2);
    }

    let maxLowering = 1.0; // 88 deg elbow angle
    let hipSagOffset = 0;
    let kneeBendOffset = 0;

    if (this.motionType === 'shallow_pushup') {
      maxLowering = 0.45; // Only lowers 45% -> ~140 deg elbow (shallow)
    } else if (this.motionType === 'hip_sag_pushup') {
      hipSagOffset = depthFactor * 32; // Hips sag downwards toward floor
    } else if (this.motionType === 'knee_drop_pushup') {
      kneeBendOffset = 28; // Knees bent onto floor
    }

    const currentDepth = depthFactor * maxLowering;

    // Floor base level in horizontal pushup (feet on right, hands on left)
    const floorY = this.canvasHeight * 0.72;

    // Hands planted on the floor
    const wristX = this.canvasWidth * 0.32;
    const wristY = floorY;

    // Feet planted on the floor
    const ankleX = wristX + 290;
    const ankleY = floorY;

    // Top position: body elevated in straight plank (lockout ~172 deg)
    // Bottom position: chest lowers, elbow flexes to ~88 deg
    const shoulderTopY = floorY - 110;
    const shoulderBottomY = floorY - 65;
    const shoulderY = shoulderTopY + currentDepth * (shoulderBottomY - shoulderTopY);
    const shoulderX = wristX + 5;

    // Elbow moves back during descent
    const elbowTopX = wristX + 6;
    const elbowBottomX = wristX + 35;
    const elbowTopY = floorY - 55;
    const elbowBottomY = floorY - 40;
    const elbowX = elbowTopX + currentDepth * (elbowBottomX - elbowTopX);
    const elbowY = elbowTopY + currentDepth * (elbowBottomY - elbowTopY);

    // Hip in plank line (179 deg straight plank)
    const hipTopY = floorY - 55;
    const hipBottomY = floorY - 32;
    const hipY = hipTopY + currentDepth * (hipBottomY - hipTopY) + hipSagOffset;
    const hipX = wristX + 145;

    // Knee in plank line
    const kneeTopY = floorY - 28;
    const kneeBottomY = floorY - 16;
    const kneeY = kneeTopY + currentDepth * (kneeBottomY - kneeTopY) + kneeBendOffset;
    const kneeX = wristX + 218;

    // Head / Nose
    const noseX = shoulderX - 35;
    const noseY = shoulderY - 8;

    const baseScore = 0.88;

    const keypoints: Keypoint[] = [
      { x: noseX, y: noseY, score: baseScore, name: 'nose' },
      { x: noseX + 4, y: noseY - 4, score: baseScore, name: 'left_eye' },
      { x: noseX - 4, y: noseY - 4, score: 0.7, name: 'right_eye' },
      { x: noseX + 10, y: noseY - 6, score: baseScore, name: 'left_ear' },
      { x: noseX - 10, y: noseY - 6, score: 0.7, name: 'right_ear' },
      // Left arm (facing camera side)
      { x: shoulderX, y: shoulderY, score: baseScore, name: 'left_shoulder' },
      { x: shoulderX - 8, y: shoulderY - 4, score: 0.65, name: 'right_shoulder' },
      { x: elbowX, y: elbowY, score: baseScore, name: 'left_elbow' },
      { x: elbowX - 8, y: elbowY - 4, score: 0.65, name: 'right_elbow' },
      { x: wristX, y: wristY, score: baseScore, name: 'left_wrist' },
      { x: wristX - 8, y: wristY - 4, score: 0.65, name: 'right_wrist' },
      // Core / Hips
      { x: hipX, y: hipY, score: baseScore, name: 'left_hip' },
      { x: hipX - 8, y: hipY - 2, score: 0.7, name: 'right_hip' },
      // Legs
      { x: kneeX, y: kneeY, score: baseScore, name: 'left_knee' },
      { x: kneeX - 8, y: kneeY - 2, score: 0.7, name: 'right_knee' },
      { x: ankleX, y: ankleY, score: baseScore, name: 'left_ankle' },
      { x: ankleX - 8, y: ankleY - 2, score: 0.7, name: 'right_ankle' },
    ];

    return keypoints;
  }
}

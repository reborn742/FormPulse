import {
  DEFAULT_PUSHUP_CONFIG,
  PUSHUP_STATE_MACHINE_CONSTANTS,
} from '../config/pushupThresholds';
import {
  FormCategoryCheck,
  FormCheckStatus,
  LivePushupBiomechanics,
  PushupConfig,
  PushupFormChecks,
  PushupPhase,
  PushupRepRecord,
  RepClassification,
} from '../types/pushup';
import { Keypoint } from '../types/squat';
import {
  MOVENET_KEYPOINTS,
  calculateAngle,
  distance2D,
  smoothKeypoints,
} from '../utils/geometry';
import { audioService } from './audioService';

export class PushupStateMachine {
  private config: PushupConfig = { ...DEFAULT_PUSHUP_CONFIG };
  private phase: PushupPhase = 'TOP';

  // Repetition counters
  private validReps = 0;
  private totalAttempts = 0;
  private invalidReps = 0;
  private needsReviewReps = 0;
  private repHistory: PushupRepRecord[] = [];

  // Tracking state
  private smoothedKeypoints: Keypoint[] | null = null;
  private consecutiveLostFrames = 0;
  private repStartTime = 0;
  private repStartElbowAngle = 154;
  private repStartShoulderY: number | null = null;
  private minElbowAngleInRep = 180;
  private maxTrunkDeviationInRep = 0;
  private maxVerticalShoulderDrop = 0;
  private currentRepIssues: Set<string> = new Set();
  private lastRepCompletedTime = 0;

  // Adaptive user baseline calibration (smoothly tracks natural top plank extension)
  private topPlankElbowAngle = 154;
  private topShoulderY: number | null = null;

  // Temporal persistence defect tracking (distinguishes real form flaws from 1-frame jitter)
  private totalFramesInRep = 0;
  private hipSagFrames = 0;
  private hipPikeFrames = 0;
  private kneeBendFrames = 0;
  private reachedTargetDepth = false;
  private ascendingMaxElbowAngle = 0;

  // Active live feedback
  private currentFeedback = {
    text: 'Assume plank position with arms extended to begin',
    type: 'neutral' as 'neutral' | 'success' | 'warning' | 'alert',
  };

  constructor(config?: Partial<PushupConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public updateConfig(newConfig: Partial<PushupConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PushupConfig {
    return this.config;
  }

  public resetSession() {
    this.phase = 'TOP';
    this.validReps = 0;
    this.totalAttempts = 0;
    this.invalidReps = 0;
    this.needsReviewReps = 0;
    this.repHistory = [];
    this.smoothedKeypoints = null;
    this.consecutiveLostFrames = 0;
    this.repStartTime = 0;
    this.repStartElbowAngle = 154;
    this.repStartShoulderY = null;
    this.minElbowAngleInRep = 180;
    this.maxTrunkDeviationInRep = 0;
    this.maxVerticalShoulderDrop = 0;
    this.topPlankElbowAngle = 154;
    this.topShoulderY = null;
    this.totalFramesInRep = 0;
    this.hipSagFrames = 0;
    this.hipPikeFrames = 0;
    this.kneeBendFrames = 0;
    this.reachedTargetDepth = false;
    this.ascendingMaxElbowAngle = 0;
    this.currentRepIssues.clear();
    this.currentFeedback = {
      text: 'Session reset. Assume plank to start.',
      type: 'neutral',
    };
  }

  /**
   * Processes a raw frame of keypoints from MoveNet detector for push-ups.
   */
  public processFrame(rawKeypoints: Keypoint[] | null, customTimestamp?: number): {
    phase: PushupPhase;
    liveBiomechanics: LivePushupBiomechanics;
    currentFeedback: { text: string; type: 'neutral' | 'success' | 'warning' | 'alert' };
    validReps: number;
    totalAttempts: number;
    invalidReps: number;
    needsReviewReps: number;
    recentReps: PushupRepRecord[];
    smoothedKeypoints: Keypoint[] | null;
  } {
    const now = customTimestamp ?? Date.now();

    // 1. Check if landmarks were detected
    if (!rawKeypoints || rawKeypoints.length < 17) {
      return this.handleLostTracking('Body not detected in frame');
    }

    // 2. Smooth keypoints
    this.smoothedKeypoints = smoothKeypoints(
      this.smoothedKeypoints,
      rawKeypoints,
      this.config.smoothingFactor
    );

    const kp = this.smoothedKeypoints;

    // 3. Determine active side based on landmark confidence
    const leftArmScore =
      ((kp[MOVENET_KEYPOINTS.LEFT_SHOULDER]?.score ?? 0) +
        (kp[MOVENET_KEYPOINTS.LEFT_ELBOW]?.score ?? 0) +
        (kp[MOVENET_KEYPOINTS.LEFT_WRIST]?.score ?? 0)) /
      3;

    const rightArmScore =
      ((kp[MOVENET_KEYPOINTS.RIGHT_SHOULDER]?.score ?? 0) +
        (kp[MOVENET_KEYPOINTS.RIGHT_ELBOW]?.score ?? 0) +
        (kp[MOVENET_KEYPOINTS.RIGHT_WRIST]?.score ?? 0)) /
      3;

    const detectedSide: 'left' | 'right' =
      this.config.activeSide === 'auto'
        ? leftArmScore >= rightArmScore
          ? 'left'
          : 'right'
        : this.config.activeSide;

    // Primary arm landmarks
    const sIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_SHOULDER : MOVENET_KEYPOINTS.RIGHT_SHOULDER;
    const eIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_ELBOW : MOVENET_KEYPOINTS.RIGHT_ELBOW;
    const wIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_WRIST : MOVENET_KEYPOINTS.RIGHT_WRIST;
    const hIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_HIP : MOVENET_KEYPOINTS.RIGHT_HIP;
    const kIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_KNEE : MOVENET_KEYPOINTS.RIGHT_KNEE;
    const aIdx = detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_ANKLE : MOVENET_KEYPOINTS.RIGHT_ANKLE;

    const shoulder = kp[sIdx];
    const elbow = kp[eIdx];
    const wrist = kp[wIdx];
    const hip = kp[hIdx];
    const knee = kp[kIdx];
    const ankle = kp[aIdx];

    const missingLandmarks: string[] = [];
    if ((shoulder?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Shoulder');
    if ((elbow?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Elbow');
    if ((wrist?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Wrist');
    if ((hip?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Hip');

    const coreArmConfidence =
      ((shoulder?.score ?? 0) + (elbow?.score ?? 0) + (wrist?.score ?? 0) + (hip?.score ?? 0)) / 4;

    // Critical upper body landmarks must be present
    if (missingLandmarks.includes('Shoulder') || missingLandmarks.includes('Elbow') || missingLandmarks.includes('Wrist')) {
      return this.handleLostTracking(`Step back: ${missingLandmarks.join(', ')} not visible`);
    }

    this.consecutiveLostFrames = 0;
    const torsoLength = Math.max(40, distance2D(shoulder, hip));

    // 4. Calculate Arm & Elbow Angles
    const currentElbowAngle = Math.round(calculateAngle(shoulder, elbow, wrist));

    let leftElbowAngle: number | null = null;
    let rightElbowAngle: number | null = null;
    const ls = kp[MOVENET_KEYPOINTS.LEFT_SHOULDER];
    const le = kp[MOVENET_KEYPOINTS.LEFT_ELBOW];
    const lw = kp[MOVENET_KEYPOINTS.LEFT_WRIST];
    const rs = kp[MOVENET_KEYPOINTS.RIGHT_SHOULDER];
    const re = kp[MOVENET_KEYPOINTS.RIGHT_ELBOW];
    const rw = kp[MOVENET_KEYPOINTS.RIGHT_WRIST];

    if ((ls?.score ?? 0) >= this.config.minLandmarkConfidence && (le?.score ?? 0) >= this.config.minLandmarkConfidence && (lw?.score ?? 0) >= this.config.minLandmarkConfidence) {
      leftElbowAngle = Math.round(calculateAngle(ls, le, lw));
    }
    if ((rs?.score ?? 0) >= this.config.minLandmarkConfidence && (re?.score ?? 0) >= this.config.minLandmarkConfidence && (rw?.score ?? 0) >= this.config.minLandmarkConfidence) {
      rightElbowAngle = Math.round(calculateAngle(rs, re, rw));
    }

    // 5. Calculate Core & Trunk Alignment
    let trunkAlignmentAngle: number | null = null;
    const hasAnkle = (ankle?.score ?? 0) >= this.config.minLandmarkConfidence;
    const hasKnee = (knee?.score ?? 0) >= this.config.minLandmarkConfidence;

    if (hasAnkle) {
      // 3-point angle at hip between shoulder and ankle
      trunkAlignmentAngle = Math.round(calculateAngle(shoulder, hip, ankle));
    } else if (hasKnee) {
      // Fallback to shoulder-hip-knee
      trunkAlignmentAngle = Math.round(calculateAngle(shoulder, hip, knee));
    }

    // 6. Calculate Knee Extension
    let kneeAngle: number | null = null;
    if (hasKnee && hasAnkle) {
      kneeAngle = Math.round(calculateAngle(hip, knee, ankle));
    }

    // 7. Perform Detailed 6-Category Form Evaluation
    const formChecks = this.evaluateAllFormCategories({
      shoulder,
      elbow,
      wrist,
      hip,
      knee,
      ankle,
      nose: kp[MOVENET_KEYPOINTS.NOSE],
      currentElbowAngle,
      leftElbowAngle,
      rightElbowAngle,
      trunkAlignmentAngle,
      kneeAngle,
      torsoLength,
      hasAnkle,
      hasKnee,
    });

    // Determine overall status
    let overallStatus: 'good' | 'warning' | 'alert' | 'unable' = 'good';
    let overallFeedback = 'Solid plank alignment';

    if (formChecks.depth.status === 'needs_correction' && (this.phase === 'BOTTOM' || this.phase === 'ASCENDING')) {
      overallStatus = 'warning';
      overallFeedback = formChecks.depth.message;
    } else if (formChecks.core.status === 'needs_correction') {
      overallStatus = 'warning';
      overallFeedback = formChecks.core.message;
    } else if (formChecks.elbows.status === 'needs_correction') {
      overallStatus = 'warning';
      overallFeedback = formChecks.elbows.message;
    } else if (formChecks.legs.status === 'needs_correction') {
      overallStatus = 'warning';
      overallFeedback = formChecks.legs.message;
    } else if (this.phase === 'BOTTOM') {
      overallStatus = 'good';
      overallFeedback = 'Target depth reached! Press up to top';
    } else if (this.phase === 'TOP') {
      overallStatus = 'good';
      overallFeedback = 'Plank ready. Begin descending when ready.';
    }

    const liveBiomechanics: LivePushupBiomechanics = {
      currentElbowAngle,
      leftElbowAngle,
      rightElbowAngle,
      trunkAlignmentAngle,
      trunkDeviationAngle: trunkAlignmentAngle !== null ? Math.abs(180 - trunkAlignmentAngle) : null,
      kneeAngle,
      detectedSide,
      primarySide: detectedSide,
      detectedView: Math.abs(leftArmScore - rightArmScore) > 0.25 ? 'side' : 'front',
      overallConfidence: coreArmConfidence,
      trackingLost: false,
      missingLandmarks,
      formChecks,
      overallStatus,
      overallFeedback,
    };

    // 8. Execute Push-Up State Machine with Biomechanical Context
    this.evaluateStateMachine(liveBiomechanics, now, shoulder, torsoLength);

    return {
      phase: this.phase,
      liveBiomechanics,
      currentFeedback: this.currentFeedback,
      validReps: this.validReps,
      totalAttempts: this.totalAttempts,
      invalidReps: this.invalidReps,
      needsReviewReps: this.needsReviewReps,
      recentReps: [...this.repHistory],
      smoothedKeypoints: this.smoothedKeypoints,
    };
  }

  /**
   * Evaluates all 6 observable push-up categories.
   */
  private evaluateAllFormCategories({
    shoulder,
    elbow,
    wrist,
    hip,
    knee,
    ankle,
    nose,
    currentElbowAngle,
    leftElbowAngle,
    rightElbowAngle,
    trunkAlignmentAngle,
    kneeAngle,
    torsoLength,
    hasAnkle,
    hasKnee,
  }: {
    shoulder: Keypoint;
    elbow: Keypoint;
    wrist: Keypoint;
    hip: Keypoint;
    knee: Keypoint;
    ankle: Keypoint;
    nose: Keypoint;
    currentElbowAngle: number;
    leftElbowAngle: number | null;
    rightElbowAngle: number | null;
    trunkAlignmentAngle: number | null;
    kneeAngle: number | null;
    torsoLength: number;
    hasAnkle: boolean;
    hasKnee: boolean;
  }): PushupFormChecks {
    const minConf = this.config.minLandmarkConfidence;

    // A. Hands & Wrists Placement
    let handsCheck: FormCategoryCheck;
    if ((wrist?.score ?? 0) < minConf || (shoulder?.score ?? 0) < minConf) {
      handsCheck = { status: 'unable_to_assess', message: 'Hands not clearly visible in frame' };
    } else {
      const xDelta = Math.abs(wrist.x - shoulder.x);
      const ratio = xDelta / torsoLength;
      if (ratio > PUSHUP_STATE_MACHINE_CONSTANTS.MAX_WRIST_SHOULDER_FORWARD_DELTA_RATIO) {
        handsCheck = {
          status: 'needs_correction',
          message: 'Hands placed too far forward/backward relative to shoulders',
          metric: `${Math.round(ratio * 100)}% torso offset`,
        };
      } else {
        handsCheck = { status: 'good', message: 'Hands positioned well under shoulders' };
      }
    }

    // B. Elbow Position & Flare
    let elbowsCheck: FormCategoryCheck;
    if (leftElbowAngle !== null && rightElbowAngle !== null) {
      const asymmetry = Math.abs(leftElbowAngle - rightElbowAngle);
      if (asymmetry > 28) {
        elbowsCheck = {
          status: 'needs_correction',
          message: `Elbow asymmetry detected (${asymmetry}° difference between arms)`,
          metric: `L: ${leftElbowAngle}° · R: ${rightElbowAngle}°`,
        };
      } else {
        elbowsCheck = {
          status: 'good',
          message: 'Both elbows moving symmetrically',
          metric: `${currentElbowAngle}°`,
        };
      }
    } else {
      elbowsCheck = {
        status: 'good',
        message: 'Elbow path tracking on active side',
        metric: `${currentElbowAngle}°`,
      };
    }

    // C. Chest & Depth
    let depthCheck: FormCategoryCheck;
    if (this.phase === 'DESCENDING' || this.phase === 'BOTTOM') {
      if (currentElbowAngle <= this.config.targetBottomElbowAngle) {
        depthCheck = {
          status: 'good',
          message: `Target depth achieved (${currentElbowAngle}° ≤ ${this.config.targetBottomElbowAngle}°)`,
          metric: `${currentElbowAngle}°`,
        };
      } else {
        depthCheck = {
          status: 'needs_correction',
          message: `Lower chest further (${currentElbowAngle}° > target ≤${this.config.targetBottomElbowAngle}°)`,
          metric: `${currentElbowAngle}°`,
        };
      }
    } else {
      depthCheck = {
        status: 'good',
        message: 'Top position — prepare to lower chest',
        metric: `${currentElbowAngle}°`,
      };
    }

    // D. Core & Hip Alignment (Plank Straightness & Sag vs Pike)
    let coreCheck: FormCategoryCheck;
    if (trunkAlignmentAngle === null || (hip?.score ?? 0) < minConf) {
      coreCheck = { status: 'unable_to_assess', message: 'Hips or legs not clearly visible' };
    } else {
      const deviation = Math.abs(180 - trunkAlignmentAngle);
      if (deviation > this.config.maxTrunkDeviationAngle) {
        // Geometric interpolation to determine exact signed displacement from plank chord
        let expectedHipY = shoulder.y;
        if (hasAnkle && Math.abs(ankle.x - shoulder.x) > 20) {
          const t = (hip.x - shoulder.x) / (ankle.x - shoulder.x);
          expectedHipY = shoulder.y + t * (ankle.y - shoulder.y);
        } else if (hasKnee && Math.abs(knee.x - shoulder.x) > 20) {
          const t = (hip.x - shoulder.x) / (knee.x - shoulder.x);
          expectedHipY = shoulder.y + t * (knee.y - shoulder.y);
        } else {
          expectedHipY = (shoulder.y + (ankle?.y ?? knee?.y ?? shoulder.y)) / 2;
        }

        // In screen coordinates (y increases downward), hip.y > expectedHipY indicates sagging toward the floor
        const isSagging = hip.y > expectedHipY + 8;
        coreCheck = {
          status: 'needs_correction',
          message: isSagging
            ? 'Hip sagging — squeeze glutes and maintain straight plank'
            : 'Hips too high (piking) — keep body in flat plank line',
          metric: `${trunkAlignmentAngle}° (ideal: 180°)`,
        };
      } else {
        coreCheck = {
          status: 'good',
          message: 'Solid plank alignment from shoulders to ankles',
          metric: `${trunkAlignmentAngle}°`,
        };
      }
    }

    // E. Leg & Foot Position
    let legsCheck: FormCategoryCheck;
    if ((knee?.score ?? 0) < minConf) {
      legsCheck = { status: 'unable_to_assess', message: 'Lower body / legs out of frame' };
    } else if (kneeAngle !== null && kneeAngle < PUSHUP_STATE_MACHINE_CONSTANTS.MIN_KNEE_EXTENSION_ANGLE) {
      legsCheck = {
        status: 'needs_correction',
        message: 'Knees bending / touching floor — extend legs fully',
        metric: `${kneeAngle}° knee angle`,
      };
    } else {
      legsCheck = {
        status: 'good',
        message: 'Legs extended and aligned in plank',
        metric: kneeAngle !== null ? `${kneeAngle}°` : 'Extended',
      };
    }

    // F. Neck & Head Alignment
    let neckCheck: FormCategoryCheck;
    if ((nose?.score ?? 0) < minConf || (shoulder?.score ?? 0) < minConf) {
      neckCheck = { status: 'unable_to_assess', message: 'Head/neck not clearly visible' };
    } else {
      const headDrop = nose.y - shoulder.y;
      if (headDrop > torsoLength * 0.45) {
        neckCheck = {
          status: 'needs_correction',
          message: 'Head hanging down — keep neck neutral aligned with spine',
        };
      } else {
        neckCheck = { status: 'good', message: 'Neck neutral, head aligned' };
      }
    }

    return {
      hands: handsCheck,
      elbows: elbowsCheck,
      depth: depthCheck,
      core: coreCheck,
      legs: legsCheck,
      neck: neckCheck,
    };
  }

  /**
   * Evaluates state machine transitions.
   */
  private evaluateStateMachine(
    bio: LivePushupBiomechanics,
    now: number,
    shoulder: Keypoint,
    torsoLength: number
  ) {
    const elbowAngle = bio.currentElbowAngle!;
    const trunkDev = bio.trunkAlignmentAngle !== null ? Math.abs(180 - bio.trunkAlignmentAngle) : 0;
    const cooldownActive = now - this.lastRepCompletedTime < PUSHUP_STATE_MACHINE_CONSTANTS.REP_COOLDOWN_MS;

    switch (this.phase) {
      case 'TOP': {
        // In TOP, continuously track and adapt to user's personalized natural lockout extension
        if (elbowAngle >= 142) {
          this.topPlankElbowAngle = Math.round(this.topPlankElbowAngle * 0.85 + elbowAngle * 0.15);
          this.topPlankElbowAngle = Math.max(146, Math.min(175, this.topPlankElbowAngle));
          this.topShoulderY =
            this.topShoulderY === null ? shoulder.y : this.topShoulderY * 0.85 + shoulder.y * 0.15;

          if (!cooldownActive) {
            this.currentFeedback = {
              text: 'Plank ready. Begin descending when ready.',
              type: 'neutral',
            };
          }
        }

        // Transition TOP -> DESCENDING
        // Initiate when elbows bend below descent start threshold or 8° below top plank baseline
        const descentThreshold = Math.min(this.config.descentStartAngle, this.topPlankElbowAngle - 8);
        if (elbowAngle < descentThreshold && !cooldownActive) {
          this.phase = 'DESCENDING';
          this.repStartTime = now;
          this.repStartElbowAngle = Math.max(elbowAngle + 5, this.topPlankElbowAngle);
          this.repStartShoulderY = shoulder.y;
          this.minElbowAngleInRep = elbowAngle;
          this.maxTrunkDeviationInRep = trunkDev;
          this.maxVerticalShoulderDrop = 0;
          this.totalFramesInRep = 1;
          this.hipSagFrames = 0;
          this.hipPikeFrames = 0;
          this.kneeBendFrames = 0;
          this.reachedTargetDepth = false;
          this.ascendingMaxElbowAngle = 0;
          this.currentRepIssues.clear();

          this.currentFeedback = {
            text: 'Descending — lower chest toward floor',
            type: 'neutral',
          };
        }
        break;
      }

      case 'DESCENDING': {
        this.totalFramesInRep++;
        if (elbowAngle < this.minElbowAngleInRep) {
          this.minElbowAngleInRep = elbowAngle;
        }
        if (trunkDev > this.maxTrunkDeviationInRep) {
          this.maxTrunkDeviationInRep = trunkDev;
        }

        const verticalDrop = shoulder.y - (this.repStartShoulderY ?? shoulder.y);
        if (verticalDrop > this.maxVerticalShoulderDrop) {
          this.maxVerticalShoulderDrop = verticalDrop;
        }

        // Accumulate fault frames for temporal persistence filtering
        if (bio.formChecks.core.status === 'needs_correction' || trunkDev > this.config.maxTrunkDeviationAngle) {
          if (bio.formChecks.core.message.toLowerCase().includes('sag') || trunkDev > this.config.maxTrunkDeviationAngle) {
            this.hipSagFrames++;
          } else {
            this.hipPikeFrames++;
          }
        }
        if (bio.formChecks.legs.status === 'needs_correction') {
          this.kneeBendFrames++;
        }

        // Check depth achievement:
        // Direct elbow threshold (e.g. <= 95°) OR
        // Adaptive 2D depth (elbow angle within 5° of target AND significant vertical chest drop)
        const hitDirectDepth = elbowAngle <= this.config.targetBottomElbowAngle;
        const hitAdaptiveDepth =
          elbowAngle <= this.config.targetBottomElbowAngle + 5 &&
          this.maxVerticalShoulderDrop >= torsoLength * 0.18;

        if (hitDirectDepth || hitAdaptiveDepth) {
          this.phase = 'BOTTOM';
          this.reachedTargetDepth = true;
          this.currentFeedback = {
            text: 'Target depth reached! Press up to top',
            type: 'success',
          };
          audioService.playRepCompleteSound(false);
        } else if (elbowAngle >= this.config.topElbowExtensionAngle) {
          // User returned all the way to top lockout without hitting depth
          this.finalizeRepetition(bio, now, torsoLength);
        } else if (elbowAngle > this.minElbowAngleInRep + 6) {
          // Clear turnaround upward before hitting depth target -> ascending shallow
          this.phase = 'ASCENDING';
          this.ascendingMaxElbowAngle = elbowAngle;
          this.currentFeedback = {
            text: 'Ascending — drive up to full arm extension',
            type: 'neutral',
          };
        }
        break;
      }

      case 'BOTTOM': {
        this.totalFramesInRep++;
        if (elbowAngle < this.minElbowAngleInRep) {
          this.minElbowAngleInRep = elbowAngle;
        }
        if (trunkDev > this.maxTrunkDeviationInRep) {
          this.maxTrunkDeviationInRep = trunkDev;
        }
        const verticalDrop = shoulder.y - (this.repStartShoulderY ?? shoulder.y);
        if (verticalDrop > this.maxVerticalShoulderDrop) {
          this.maxVerticalShoulderDrop = verticalDrop;
        }

        if (bio.formChecks.core.status === 'needs_correction' || trunkDev > this.config.maxTrunkDeviationAngle) {
          if (bio.formChecks.core.message.toLowerCase().includes('sag') || trunkDev > this.config.maxTrunkDeviationAngle) {
            this.hipSagFrames++;
          } else {
            this.hipPikeFrames++;
          }
        }

        // Transition BOTTOM -> ASCENDING as user drives upward
        if (elbowAngle > this.minElbowAngleInRep + 6) {
          this.phase = 'ASCENDING';
          this.ascendingMaxElbowAngle = elbowAngle;
          this.currentFeedback = {
            text: 'Ascending — drive up to full arm extension',
            type: 'neutral',
          };
        }
        break;
      }

      case 'ASCENDING': {
        this.totalFramesInRep++;
        if (trunkDev > this.maxTrunkDeviationInRep) {
          this.maxTrunkDeviationInRep = trunkDev;
        }
        if (elbowAngle > this.ascendingMaxElbowAngle) {
          this.ascendingMaxElbowAngle = elbowAngle;
        }

        if (bio.formChecks.core.status === 'needs_correction' || trunkDev > this.config.maxTrunkDeviationAngle) {
          if (bio.formChecks.core.message.toLowerCase().includes('sag') || trunkDev > this.config.maxTrunkDeviationAngle) {
            this.hipSagFrames++;
          } else {
            this.hipPikeFrames++;
          }
        }
        if (bio.formChecks.legs.status === 'needs_correction') {
          this.kneeBendFrames++;
        }

        // Return to top lockout criteria (PREVENTS USER EXHAUSTION)
        // 1. Hit configured top lockout threshold (e.g. >= 150°)
        const hitConfigLockout = elbowAngle >= this.config.topElbowExtensionAngle;
        // 2. Hit adaptive top lockout (within 5° of user's natural top plank baseline, min 147°)
        const hitAdaptiveLockout = elbowAngle >= Math.min(this.topPlankElbowAngle - 5, 147);
        // 3. Chest has returned to top height and arms are extended >= 145°
        const shoulderReturned =
          this.repStartShoulderY !== null &&
          shoulder.y <= this.repStartShoulderY + torsoLength * 0.10;
        const hitHeightLockout = elbowAngle >= 145 && shoulderReturned;
        // 4. Fluid rep chaining: user reached at least 146° and has begun descending into the next rep
        const fluidNextRep =
          this.ascendingMaxElbowAngle >= 146 &&
          elbowAngle < this.ascendingMaxElbowAngle - 5;

        if (hitConfigLockout || hitAdaptiveLockout || hitHeightLockout || fluidNextRep) {
          this.finalizeRepetition(bio, now, torsoLength);
        } else if (now - this.repStartTime > PUSHUP_STATE_MACHINE_CONSTANTS.MAX_REP_DURATION_MS) {
          this.rejectIncompleteRep('Repetition timed out (stalled in ascent)', now, bio);
        }
        break;
      }
    }
  }

  /**
   * Finalizes completed push-up rep with robust biometric validation.
   */
  private finalizeRepetition(
    bio: LivePushupBiomechanics,
    now: number,
    torsoLength: number
  ) {
    const duration = now - this.repStartTime;
    this.totalAttempts += 1;
    this.lastRepCompletedTime = now;
    this.phase = 'TOP';

    const issueList: string[] = [];

    // 1. Flexion range of motion check (PREVENTS FALSE ACCEPTANCE: head bobs & micro-dips)
    const romFlexion = Math.max(0, this.repStartElbowAngle - this.minElbowAngleInRep);
    const romValid = romFlexion >= PUSHUP_STATE_MACHINE_CONSTANTS.MIN_REQUIRED_ELBOW_ROM_DEG;
    if (!romValid) {
      issueList.push(
        `Insufficient arm bend (${romFlexion}° ROM, min ${PUSHUP_STATE_MACHINE_CONSTANTS.MIN_REQUIRED_ELBOW_ROM_DEG}° required)`
      );
    }

    // 2. Depth check
    const depthValid =
      this.reachedTargetDepth ||
      this.minElbowAngleInRep <= this.config.targetBottomElbowAngle ||
      (this.minElbowAngleInRep <= this.config.targetBottomElbowAngle + 4 &&
        this.maxVerticalShoulderDrop >= torsoLength * 0.16);

    if (!depthValid) {
      issueList.push(
        `Shallow depth (reached ${this.minElbowAngleInRep}°, target ≤${this.config.targetBottomElbowAngle}°)`
      );
    }

    // 3. Vertical descent check (PREVENTS FALSE ACCEPTANCE: moving without lowering chest)
    const verticalValid = this.maxVerticalShoulderDrop >= torsoLength * 0.08;
    if (!verticalValid && romValid) {
      issueList.push('Chest must lower down toward the floor');
    }

    // 4. Core & Plank Alignment (TEMPORAL FILTERING: avoids 1-frame jitter false rejections)
    const totalFrames = Math.max(1, this.totalFramesInRep);
    const sagRatio = this.hipSagFrames / totalFrames;
    const pikeRatio = this.hipPikeFrames / totalFrames;

    const isHipSag =
      (this.hipSagFrames >= PUSHUP_STATE_MACHINE_CONSTANTS.MIN_PERSISTENT_FAULT_FRAMES &&
        sagRatio >= 0.10) ||
      (this.maxTrunkDeviationInRep > this.config.maxTrunkDeviationAngle && this.hipSagFrames >= 2);

    const isHipPike =
      this.hipPikeFrames >= PUSHUP_STATE_MACHINE_CONSTANTS.MIN_PERSISTENT_FAULT_FRAMES &&
      pikeRatio >= 0.20;

    const isExtremeSag = this.maxTrunkDeviationInRep >= 34;

    const coreValid = !isHipSag && !isHipPike && !isExtremeSag;
    if (isHipSag || isExtremeSag) {
      issueList.push('Hip sagging — squeeze glutes and maintain straight plank');
    } else if (isHipPike) {
      issueList.push('Hips piked too high — lower hips into flat plank line');
    }

    // 5. Knee / Leg check (PREVENTS FALSE ACCEPTANCE: knees resting on floor)
    const kneeBendRatio = this.kneeBendFrames / totalFrames;
    const kneeValid =
      this.kneeBendFrames < PUSHUP_STATE_MACHINE_CONSTANTS.MIN_PERSISTENT_FAULT_FRAMES + 2 ||
      kneeBendRatio < 0.28;
    if (!kneeValid) {
      issueList.push('Knees touching or resting on floor — extend legs for standard push-up');
    }

    // 6. Duration check (PREVENTS FALSE ACCEPTANCE: glitch fast counts)
    const durationValid = duration >= PUSHUP_STATE_MACHINE_CONSTANTS.MIN_REP_DURATION_MS;
    if (!durationValid) {
      issueList.push('Repetition performed too fast');
    }

    // Classification
    const hasLowConfidence = bio.overallConfidence < 0.35;
    let classification: RepClassification = 'valid';

    if (hasLowConfidence) {
      classification = 'needs_review';
      this.needsReviewReps += 1;
    } else if (romValid && depthValid && coreValid && kneeValid && durationValid) {
      classification = 'valid';
      this.validReps += 1;
    } else {
      classification = 'invalid';
      this.invalidReps += 1;
    }

    const repRecord: PushupRepRecord = {
      id: `pushup-${this.totalAttempts}-${now}`,
      repNumber: this.totalAttempts,
      isValid: classification === 'valid',
      classification,
      minElbowAngle: this.minElbowAngleInRep,
      maxTrunkDeviation: this.maxTrunkDeviationInRep,
      durationMs: duration,
      startTime: this.repStartTime,
      endTime: now,
      issues: issueList,
      categoryStatuses: {
        hands: bio.formChecks.hands.status,
        elbows: bio.formChecks.elbows.status,
        depth: depthValid ? 'good' : 'needs_correction',
        core: coreValid ? 'good' : 'needs_correction',
        legs: kneeValid ? 'good' : 'needs_correction',
        neck: bio.formChecks.neck.status,
      },
    };

    this.repHistory.unshift(repRecord);

    if (classification === 'valid') {
      audioService.playRepCompleteSound(this.config.enableSoundEffects);
      if (this.config.enableVoiceCoach) {
        audioService.speak(`${this.validReps}`, true);
      }
      this.currentFeedback = {
        text: `Push-up #${this.validReps} counted! Solid depth (${this.minElbowAngleInRep}°)`,
        type: 'success',
      };
    } else if (classification === 'invalid') {
      audioService.playWarningSound(this.config.enableSoundEffects);
      if (this.config.enableVoiceCoach) {
        if (!depthValid) {
          audioService.speak('Lower your chest further', true);
        } else if (!coreValid) {
          audioService.speak('Keep your hips straight', true);
        } else if (!romValid) {
          audioService.speak('Bend your elbows deeper', true);
        }
      }
      this.currentFeedback = {
        text: `Invalid rep: ${issueList[0] || 'Incomplete depth or form'}`,
        type: 'alert',
      };
    } else {
      this.currentFeedback = {
        text: 'Rep completed — needs review due to low visibility',
        type: 'warning',
      };
    }
  }

  private rejectIncompleteRep(reason: string, now: number, bio: LivePushupBiomechanics) {
    this.phase = 'TOP';
    this.totalAttempts += 1;
    this.invalidReps += 1;
    this.lastRepCompletedTime = now;

    this.repHistory.unshift({
      id: `pushup-${this.totalAttempts}-${now}`,
      repNumber: this.totalAttempts,
      isValid: false,
      classification: 'invalid',
      minElbowAngle: this.minElbowAngleInRep,
      maxTrunkDeviation: this.maxTrunkDeviationInRep,
      durationMs: now - this.repStartTime,
      startTime: this.repStartTime,
      endTime: now,
      issues: [reason],
      categoryStatuses: {
        hands: bio.formChecks.hands.status,
        elbows: bio.formChecks.elbows.status,
        depth: 'needs_correction',
        core: bio.formChecks.core.status,
        legs: bio.formChecks.legs.status,
        neck: bio.formChecks.neck.status,
      },
    });

    this.currentFeedback = {
      text: reason,
      type: 'alert',
    };
  }

  private handleLostTracking(message: string) {
    this.consecutiveLostFrames += 1;

    if (
      this.consecutiveLostFrames >= PUSHUP_STATE_MACHINE_CONSTANTS.TRACKING_LOSS_FRAMES_THRESHOLD &&
      this.phase !== 'TOP'
    ) {
      this.phase = 'TOP';
      this.currentRepIssues.clear();
    }

    this.currentFeedback = {
      text: `Hold on — ${message}`,
      type: 'alert',
    };

    const emptyChecks: PushupFormChecks = {
      hands: { status: 'unable_to_assess', message: 'Tracking lost' },
      elbows: { status: 'unable_to_assess', message: 'Tracking lost' },
      depth: { status: 'unable_to_assess', message: 'Tracking lost' },
      core: { status: 'unable_to_assess', message: 'Tracking lost' },
      legs: { status: 'unable_to_assess', message: 'Tracking lost' },
      neck: { status: 'unable_to_assess', message: 'Tracking lost' },
    };

    const emptyBio: LivePushupBiomechanics = {
      currentElbowAngle: null,
      leftElbowAngle: null,
      rightElbowAngle: null,
      trunkAlignmentAngle: null,
      trunkDeviationAngle: null,
      kneeAngle: null,
      detectedSide: 'left',
      primarySide: 'left',
      detectedView: 'side',
      overallConfidence: 0,
      trackingLost: true,
      missingLandmarks: ['All'],
      formChecks: emptyChecks,
      overallStatus: 'unable',
      overallFeedback: 'Tracking lost',
    };

    return {
      phase: this.phase,
      liveBiomechanics: emptyBio,
      currentFeedback: this.currentFeedback,
      validReps: this.validReps,
      totalAttempts: this.totalAttempts,
      invalidReps: this.invalidReps,
      needsReviewReps: this.needsReviewReps,
      recentReps: [...this.repHistory],
      smoothedKeypoints: null,
    };
  }
}

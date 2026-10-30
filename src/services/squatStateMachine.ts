import {
  DEFAULT_SQUAT_CONFIG,
  STATE_MACHINE_CONSTANTS,
} from '../config/thresholds';
import {
  FormIssue,
  FormVerdict,
  LiveBiomechanics,
  RepRecord,
  SittingStatus,
  SquatConfig,
  SquatPhase,
  Keypoint,
} from '../types/squat';
import {
  MOVENET_KEYPOINTS,
  calculateAngle,
  calculateTorsoLean,
  calculateKneeValgusRatio,
  distance2D,
  calculateFootFlatness,
  evaluateSittingPosition,
  inferViewMode,
  pickBestSide,
  smoothKeypoints,
} from '../utils/geometry';
import { audioService } from './audioService';

export class SquatStateMachine {
  private config: SquatConfig = { ...DEFAULT_SQUAT_CONFIG };
  private phase: SquatPhase = 'STANDING';

  // Repetition counters
  private validReps = 0;
  private totalAttempts = 0;
  private rejectedReps = 0;
  private repHistory: RepRecord[] = [];

  // Tracking state
  private smoothedKeypoints: Keypoint[] | null = null;
  private consecutiveLostFrames = 0;
  private repStartTime = 0;
  private minKneeAngleInRep = 180;
  private maxTorsoLeanInRep = 0;
  private minKneeValgusRatioInRep: number | null = null;
  private currentRepIssues: Set<string> = new Set();
  private lastRepCompletedTime = 0;

  // Calibrated standing baseline for foot flatness and shank geometry
  private baselineAnkleY: number | null = null;
  private baselineShankLength = 120;
  private bestSittingStatusInRep: SittingStatus = 'upright';
  private hadHeelLiftInRep = false;

  // Active live feedback
  private currentFeedback = {
    text: 'Stand upright facing camera to begin',
    type: 'neutral' as 'neutral' | 'success' | 'warning' | 'alert',
  };

  // Active form issues for visual rendering
  private activeIssues: FormIssue[] = [];

  constructor(config?: Partial<SquatConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public updateConfig(newConfig: Partial<SquatConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SquatConfig {
    return this.config;
  }

  public resetSession() {
    this.phase = 'STANDING';
    this.validReps = 0;
    this.totalAttempts = 0;
    this.rejectedReps = 0;
    this.repHistory = [];
    this.smoothedKeypoints = null;
    this.consecutiveLostFrames = 0;
    this.repStartTime = 0;
    this.minKneeAngleInRep = 180;
    this.maxTorsoLeanInRep = 0;
    this.minKneeValgusRatioInRep = null;
    this.baselineAnkleY = null;
    this.bestSittingStatusInRep = 'upright';
    this.hadHeelLiftInRep = false;
    this.currentRepIssues.clear();
    this.activeIssues = [];
    this.currentFeedback = {
      text: 'Session reset. Stand upright to start.',
      type: 'neutral',
    };
  }

  /**
   * Processes a raw frame of keypoints from MoveNet detector.
   */
  public processFrame(rawKeypoints: Keypoint[] | null, customTimestamp?: number): {
    phase: SquatPhase;
    liveBiomechanics: LiveBiomechanics;
    currentFeedback: { text: string; type: 'neutral' | 'success' | 'warning' | 'alert' };
    validReps: number;
    totalAttempts: number;
    rejectedReps: number;
    recentReps: RepRecord[];
    activeIssues: FormIssue[];
    smoothedKeypoints: Keypoint[] | null;
  } {
    const now = customTimestamp ?? Date.now();

    // 1. Check if landmarks were detected
    if (!rawKeypoints || rawKeypoints.length < 17) {
      return this.handleLostTracking('Body not detected in frame');
    }

    // 2. Smooth keypoints with Exponential Moving Average (EMA)
    this.smoothedKeypoints = smoothKeypoints(
      this.smoothedKeypoints,
      rawKeypoints,
      this.config.smoothingFactor
    );

    const kp = this.smoothedKeypoints;

    // 3. Determine view mode & best side
    const detectedView =
      this.config.viewMode === 'auto'
        ? inferViewMode(kp, this.config.minLandmarkConfidence)
        : this.config.viewMode;

    const detectedSide =
      this.config.activeSide === 'auto'
        ? pickBestSide(kp)
        : this.config.activeSide;

    // 4. Validate confidence of required landmarks
    const shoulderIdx =
      detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_SHOULDER : MOVENET_KEYPOINTS.RIGHT_SHOULDER;
    const hipIdx =
      detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_HIP : MOVENET_KEYPOINTS.RIGHT_HIP;
    const kneeIdx =
      detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_KNEE : MOVENET_KEYPOINTS.RIGHT_KNEE;
    const ankleIdx =
      detectedSide === 'left' ? MOVENET_KEYPOINTS.LEFT_ANKLE : MOVENET_KEYPOINTS.RIGHT_ANKLE;

    const shoulder = kp[shoulderIdx];
    const hip = kp[hipIdx];
    const knee = kp[kneeIdx];
    const ankle = kp[ankleIdx];

    const missingLandmarks: string[] = [];
    if ((shoulder?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Shoulder');
    if ((hip?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Hip');
    if ((knee?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Knee');
    if ((ankle?.score ?? 0) < this.config.minLandmarkConfidence) missingLandmarks.push('Ankle');

    const keyConfidence =
      ((shoulder?.score ?? 0) + (hip?.score ?? 0) + (knee?.score ?? 0) + (ankle?.score ?? 0)) / 4;

    // Critical lower-body landmarks must be present
    if (missingLandmarks.includes('Knee') || missingLandmarks.includes('Hip') || missingLandmarks.includes('Ankle')) {
      return this.handleLostTracking(`Step back: ${missingLandmarks.join(', ')} not clearly visible`);
    }

    // Reset lost tracking counter on good frame
    this.consecutiveLostFrames = 0;

    // 5. Calculate Biomechanics
    const kneeAngle = Math.round(calculateAngle(hip, knee, ankle));
    const hipAngle = Math.round(calculateAngle(shoulder, hip, knee));
    const torsoLean = Math.round(calculateTorsoLean(shoulder, hip));

    // Dynamic shank length
    const currentShankLength = Math.max(35, distance2D(knee, ankle));

    // Calibrate standing floor ankle baseline when upright
    if (kneeAngle >= this.config.standingAngleThreshold) {
      if (this.baselineAnkleY === null) {
        this.baselineAnkleY = ankle.y;
      } else {
        this.baselineAnkleY = this.baselineAnkleY * 0.9 + ankle.y * 0.1;
      }
      this.baselineShankLength = this.baselineShankLength * 0.9 + currentShankLength * 0.1;
    }

    // Foot Flatness / Heel Lift Check
    const footFlatness = calculateFootFlatness(
      ankle,
      this.baselineAnkleY,
      this.baselineShankLength,
      STATE_MACHINE_CONSTANTS.HEEL_LIFT_RATIO_WARNING
    );

    // Sitting Depth Evaluation (Proper Sitting vs Half Sitting)
    const sittingEvaluation = evaluateSittingPosition(
      hip,
      knee,
      this.baselineShankLength,
      kneeAngle,
      this.config.targetDepthAngle
    );

    // Knee valgus in front view
    let kneeValgusRatio: number | null = null;
    if (detectedView === 'front') {
      const lKnee = kp[MOVENET_KEYPOINTS.LEFT_KNEE];
      const rKnee = kp[MOVENET_KEYPOINTS.RIGHT_KNEE];
      const lAnkle = kp[MOVENET_KEYPOINTS.LEFT_ANKLE];
      const rAnkle = kp[MOVENET_KEYPOINTS.RIGHT_ANKLE];

      if (
        (lKnee?.score ?? 0) >= this.config.minLandmarkConfidence &&
        (rKnee?.score ?? 0) >= this.config.minLandmarkConfidence &&
        (lAnkle?.score ?? 0) >= this.config.minLandmarkConfidence &&
        (rAnkle?.score ?? 0) >= this.config.minLandmarkConfidence
      ) {
        kneeValgusRatio = calculateKneeValgusRatio(lKnee, rKnee, lAnkle, rAnkle);
      }
    }

    const liveBiomechanics: LiveBiomechanics = {
      currentKneeAngle: kneeAngle,
      currentHipAngle: hipAngle,
      torsoLeanAngle: torsoLean,
      kneeValgusRatio,
      sittingStatus: sittingEvaluation.status,
      isFootFlat: footFlatness.isFlat,
      heelElevationDelta: footFlatness.elevationDelta,
      hipKneeHeightRatio: sittingEvaluation.hipKneeRatio,
      detectedSide,
      detectedView,
      overallConfidence: keyConfidence,
      trackingLost: false,
      missingLandmarks,
    };

    // 6. Execute State Machine
    this.evaluateStateMachine(liveBiomechanics, now);

    return {
      phase: this.phase,
      liveBiomechanics,
      currentFeedback: this.currentFeedback,
      validReps: this.validReps,
      totalAttempts: this.totalAttempts,
      rejectedReps: this.rejectedReps,
      recentReps: [...this.repHistory],
      activeIssues: [...this.activeIssues],
      smoothedKeypoints: this.smoothedKeypoints,
    };
  }

  /**
   * Evaluates state machine transitions and triggers biomechanical form checks.
   */
  private evaluateStateMachine(bio: LiveBiomechanics, now: number) {
    const kneeAngle = bio.currentKneeAngle!;
    const torsoLean = bio.torsoLeanAngle ?? 0;
    const cooldownActive = now - this.lastRepCompletedTime < STATE_MACHINE_CONSTANTS.REP_COOLDOWN_MS;

    switch (this.phase) {
      case 'STANDING': {
        this.activeIssues = [];

        // Check standing upright alignment
        if (kneeAngle >= this.config.standingAngleThreshold) {
          if (!cooldownActive) {
            this.currentFeedback = {
              text: 'Ready. Begin squatting down.',
              type: 'neutral',
            };
          }
        }

        // Transition STANDING -> DESCENDING
        if (kneeAngle < this.config.descentStartAngle && !cooldownActive) {
          this.phase = 'DESCENDING';
          this.repStartTime = now;
          this.minKneeAngleInRep = kneeAngle;
          this.maxTorsoLeanInRep = torsoLean;
          this.minKneeValgusRatioInRep = bio.kneeValgusRatio;
          this.bestSittingStatusInRep = bio.sittingStatus;
          this.hadHeelLiftInRep = false;
          this.currentRepIssues.clear();

          this.currentFeedback = {
            text: 'Descending — keep feet flat and sink hips back',
            type: 'neutral',
          };
        }
        break;
      }

      case 'DESCENDING': {
        // Track minimum depth achieved so far
        if (kneeAngle < this.minKneeAngleInRep) {
          this.minKneeAngleInRep = kneeAngle;
        }
        if (torsoLean > this.maxTorsoLeanInRep) {
          this.maxTorsoLeanInRep = torsoLean;
        }
        if (bio.kneeValgusRatio !== null) {
          if (
            this.minKneeValgusRatioInRep === null ||
            bio.kneeValgusRatio < this.minKneeValgusRatioInRep
          ) {
            this.minKneeValgusRatioInRep = bio.kneeValgusRatio;
          }
        }

        // Track best sitting status
        if (bio.sittingStatus === 'deep_sitting') {
          this.bestSittingStatusInRep = 'deep_sitting';
        } else if (bio.sittingStatus === 'parallel_sitting' && this.bestSittingStatusInRep !== 'deep_sitting') {
          this.bestSittingStatusInRep = 'parallel_sitting';
        } else if (bio.sittingStatus === 'half_sitting' && this.bestSittingStatusInRep === 'upright') {
          this.bestSittingStatusInRep = 'half_sitting';
        }

        // Live Form Checks during descent
        this.checkLiveFormErrors(bio, now);

        // Check if user reached proper sitting depth (parallel or deep)
        const reachedProperSitting =
          kneeAngle <= this.config.targetDepthAngle ||
          bio.sittingStatus === 'parallel_sitting' ||
          bio.sittingStatus === 'deep_sitting';

        if (reachedProperSitting) {
          this.phase = 'BOTTOM';
          this.currentFeedback = {
            text: 'Proper sitting depth! Drive up through flat feet',
            type: 'success',
          };
          audioService.playRepCompleteSound(false);
        } else if (kneeAngle > this.minKneeAngleInRep + 6) {
          // User started ascending BEFORE reaching proper sitting depth -> Half sitting
          this.phase = 'ASCENDING';
          this.currentRepIssues.add('Half sitting (shallow) — did not reach parallel depth');
          this.currentFeedback = {
            text: `Half sitting (${this.minKneeAngleInRep}°) — sink hips down to knee level`,
            type: 'warning',
          };
          audioService.playWarningSound(this.config.enableSoundEffects);
        }
        break;
      }

      case 'BOTTOM': {
        if (kneeAngle < this.minKneeAngleInRep) {
          this.minKneeAngleInRep = kneeAngle;
        }
        if (torsoLean > this.maxTorsoLeanInRep) {
          this.maxTorsoLeanInRep = torsoLean;
        }
        if (bio.sittingStatus === 'deep_sitting') {
          this.bestSittingStatusInRep = 'deep_sitting';
        } else if (bio.sittingStatus === 'parallel_sitting' && this.bestSittingStatusInRep !== 'deep_sitting') {
          this.bestSittingStatusInRep = 'parallel_sitting';
        }

        this.checkLiveFormErrors(bio, now);

        // Transition BOTTOM -> ASCENDING as user drives upward
        if (kneeAngle > this.minKneeAngleInRep + 5) {
          this.phase = 'ASCENDING';
          this.currentFeedback = {
            text: 'Ascending — drive up to full standing',
            type: 'neutral',
          };
        }
        break;
      }

      case 'ASCENDING': {
        if (torsoLean > this.maxTorsoLeanInRep) {
          this.maxTorsoLeanInRep = torsoLean;
        }

        this.checkLiveFormErrors(bio, now);

        // If user returned to standing upright
        if (kneeAngle >= this.config.standingAngleThreshold) {
          this.finalizeRepetition(bio, now);
        } else if (now - this.repStartTime > STATE_MACHINE_CONSTANTS.MAX_REP_DURATION_MS) {
          // Timed out incomplete repetition
          this.rejectIncompleteRep('Repetition timed out', now);
        }
        break;
      }
    }
  }

  /**
   * Real-time form defect checks during active movement.
   */
  private checkLiveFormErrors(bio: LiveBiomechanics, now: number) {
    const issues: FormIssue[] = [];

    // 1. Foot Flat on Floor / Heel Elevation Check
    if (bio.isFootFlat === false && this.config.enforceFootFlat) {
      this.hadHeelLiftInRep = true;
      this.currentRepIssues.add('Heel lifted — foot not flat on floor');
      issues.push({
        id: `heellift-${now}`,
        type: 'heel_lift',
        severity: 'warning',
        message: 'Heels lifting off floor — keep feet completely flat and plant your heels',
        timestamp: now,
      });
      this.currentFeedback = {
        text: 'Keep feet flat — avoid rising onto toes',
        type: 'warning',
      };
    }

    // 2. Sitting Position Check
    if (this.phase === 'DESCENDING' || this.phase === 'BOTTOM') {
      if (bio.sittingStatus === 'half_sitting' && (bio.currentKneeAngle ?? 180) < 135) {
        issues.push({
          id: `halfsit-${now}`,
          type: 'half_sitting',
          severity: 'warning',
          message: 'Half sitting position — hips still above knee level',
          timestamp: now,
        });
      }
    }

    // 3. Excessive Forward Lean (Side View)
    if (bio.detectedView === 'side' && bio.torsoLeanAngle !== null) {
      if (bio.torsoLeanAngle > this.config.maxTorsoLeanAngle) {
        this.currentRepIssues.add('Excessive forward lean');
        issues.push({
          id: `lean-${now}`,
          type: 'forward_lean',
          severity: 'warning',
          message: `Excessive forward lean (${bio.torsoLeanAngle}° > ${this.config.maxTorsoLeanAngle}°)`,
          timestamp: now,
        });
        this.currentFeedback = {
          text: 'Chest up — avoid leaning too far forward',
          type: 'warning',
        };
      }
    }

    // 4. Knee Valgus / Inward Caving (Front View)
    if (bio.detectedView === 'front' && bio.kneeValgusRatio !== null) {
      if (bio.kneeValgusRatio < STATE_MACHINE_CONSTANTS.KNEE_VALGUS_RATIO_WARNING) {
        this.currentRepIssues.add('Knees caving inward (valgus)');
        issues.push({
          id: `valgus-${now}`,
          type: 'knee_valgus',
          severity: 'warning',
          message: 'Knees caving inward relative to feet',
          timestamp: now,
        });
        this.currentFeedback = {
          text: 'Push knees outward — align over toes',
          type: 'warning',
        };
      }
    }

    this.activeIssues = issues;
  }

  /**
   * Completes a repetition when user returns to upright standing.
   */
  private finalizeRepetition(bio: LiveBiomechanics, now: number) {
    const duration = now - this.repStartTime;
    this.totalAttempts += 1;
    this.lastRepCompletedTime = now;
    this.phase = 'STANDING';

    const reachedProperSitting =
      this.bestSittingStatusInRep === 'parallel_sitting' ||
      this.bestSittingStatusInRep === 'deep_sitting' ||
      this.minKneeAngleInRep <= this.config.targetDepthAngle;

    const durationValid = duration >= STATE_MACHINE_CONSTANTS.MIN_REP_DURATION_MS;
    const footFlatValid = !this.config.enforceFootFlat || !this.hadHeelLiftInRep;

    const issueList = Array.from(this.currentRepIssues);

    if (reachedProperSitting && durationValid && footFlatValid) {
      // Repetition is VALID
      this.validReps += 1;
      const verdict: FormVerdict = issueList.length > 0 ? 'WARNING' : 'CLEAN';

      const repRecord: RepRecord = {
        repNumber: this.validReps,
        isValid: true,
        minKneeAngle: this.minKneeAngleInRep,
        maxTorsoLean: this.maxTorsoLeanInRep,
        durationMs: duration,
        startTime: this.repStartTime,
        endTime: now,
        issues: issueList,
        verdict,
        viewModeUsed: bio.detectedView,
        sittingDepth: 'proper',
        footFlat: !this.hadHeelLiftInRep,
      };

      this.repHistory.unshift(repRecord);

      // Audio & Voice Coach
      audioService.playRepCompleteSound(this.config.enableSoundEffects);
      if (this.config.enableVoiceCoach) {
        if (verdict === 'CLEAN') {
          audioService.speak(`${this.validReps}`, true);
        } else {
          audioService.speak(`${this.validReps}. Keep feet flat`, true);
        }
      }

      this.currentFeedback = {
        text: `Rep ${this.validReps} counted! Proper sitting (${this.minKneeAngleInRep}°)${verdict === 'CLEAN' ? ' · Flat feet ✓' : ''}`,
        type: 'success',
      };
    } else {
      // Repetition is REJECTED
      this.rejectedReps += 1;
      if (!reachedProperSitting) {
        issueList.push(`Half sitting (reached ${this.minKneeAngleInRep}°, proper depth ≤${this.config.targetDepthAngle}°)`);
      }
      if (!durationValid) {
        issueList.push('Repetition too fast');
      }
      if (!footFlatValid) {
        issueList.push('Heel lifted off floor — foot was not flat');
      }

      const repRecord: RepRecord = {
        repNumber: this.totalAttempts,
        isValid: false,
        minKneeAngle: this.minKneeAngleInRep,
        maxTorsoLean: this.maxTorsoLeanInRep,
        durationMs: duration,
        startTime: this.repStartTime,
        endTime: now,
        issues: issueList,
        verdict: 'REJECTED',
        viewModeUsed: bio.detectedView,
        sittingDepth: reachedProperSitting ? 'proper' : 'half',
        footFlat: !this.hadHeelLiftInRep,
      };

      this.repHistory.unshift(repRecord);

      audioService.playWarningSound(this.config.enableSoundEffects);
      if (this.config.enableVoiceCoach) {
        if (!reachedProperSitting) {
          audioService.speak('Half squat. Sink deeper to parallel', true);
        } else if (!footFlatValid) {
          audioService.speak('Keep your heels flat on the floor', true);
        }
      }

      this.currentFeedback = {
        text: `Incomplete rep: ${issueList[0] ?? 'Improper sitting depth'}`,
        type: 'alert',
      };
    }
  }

  private rejectIncompleteRep(reason: string, now: number) {
    this.phase = 'STANDING';
    this.totalAttempts += 1;
    this.rejectedReps += 1;
    this.lastRepCompletedTime = now;

    this.repHistory.unshift({
      repNumber: this.totalAttempts,
      isValid: false,
      minKneeAngle: this.minKneeAngleInRep,
      maxTorsoLean: this.maxTorsoLeanInRep,
      durationMs: now - this.repStartTime,
      startTime: this.repStartTime,
      endTime: now,
      issues: [reason],
      verdict: 'REJECTED',
      viewModeUsed: this.config.viewMode === 'front' ? 'front' : 'side',
      sittingDepth: 'half',
      footFlat: !this.hadHeelLiftInRep,
    });

    this.currentFeedback = {
      text: reason,
      type: 'alert',
    };
  }

  /**
   * Handles consecutive lost tracking safely.
   */
  private handleLostTracking(message: string) {
    this.consecutiveLostFrames += 1;

    // Reset rep state if tracking lost during a rep
    if (
      this.consecutiveLostFrames >= STATE_MACHINE_CONSTANTS.TRACKING_LOSS_FRAMES_THRESHOLD &&
      this.phase !== 'STANDING'
    ) {
      this.phase = 'STANDING';
      this.currentRepIssues.clear();
    }

    this.currentFeedback = {
      text: `Hold on — ${message}`,
      type: 'alert',
    };

    const emptyBiomechanics: LiveBiomechanics = {
      currentKneeAngle: null,
      currentHipAngle: null,
      torsoLeanAngle: null,
      kneeValgusRatio: null,
      sittingStatus: 'upright',
      isFootFlat: null,
      heelElevationDelta: null,
      hipKneeHeightRatio: null,
      detectedSide: 'left',
      detectedView: 'side',
      overallConfidence: 0,
      trackingLost: true,
      missingLandmarks: ['All'],
    };

    return {
      phase: this.phase,
      liveBiomechanics: emptyBiomechanics,
      currentFeedback: this.currentFeedback,
      validReps: this.validReps,
      totalAttempts: this.totalAttempts,
      rejectedReps: this.rejectedReps,
      recentReps: [...this.repHistory],
      activeIssues: this.activeIssues,
      smoothedKeypoints: null,
    };
  }
}

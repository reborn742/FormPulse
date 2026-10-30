export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

export type CameraViewMode = 'side' | 'front' | 'auto';
export type ActiveSide = 'auto' | 'left' | 'right';

export type SquatPhase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export type FormVerdict = 'CLEAN' | 'WARNING' | 'REJECTED';

export type SittingStatus = 'upright' | 'half_sitting' | 'parallel_sitting' | 'deep_sitting';

export interface FormIssue {
  id: string;
  type: 'depth' | 'forward_lean' | 'knee_valgus' | 'incomplete' | 'visibility' | 'heel_lift' | 'half_sitting';
  severity: 'warning' | 'error';
  message: string;
  timestamp: number;
}

export interface RepRecord {
  repNumber: number;
  isValid: boolean;
  minKneeAngle: number; // Minimum knee angle reached at bottom (depth)
  maxTorsoLean: number; // Maximum torso lean in degrees
  durationMs: number;
  startTime: number;
  endTime: number;
  issues: string[];
  verdict: FormVerdict;
  viewModeUsed: 'side' | 'front';
  sittingDepth: 'proper' | 'half';
  footFlat: boolean;
}

export interface SquatConfig {
  // Knee depth threshold in degrees (smaller angle = deeper squat)
  // Deep squat: ~80 deg, Parallel: ~95 deg, Quarter: ~115 deg
  targetDepthAngle: number;
  
  // Angle threshold to consider standing upright (typically 160-175 deg)
  standingAngleThreshold: number;
  
  // Angle threshold where descent is officially initiated
  descentStartAngle: number;
  
  // Maximum allowed torso forward lean from vertical in degrees (side view)
  maxTorsoLeanAngle: number;
  
  // Minimum keypoint detection confidence (0.0 - 1.0)
  minLandmarkConfidence: number;
  
  // Camera view mode preference
  viewMode: CameraViewMode;
  
  // Preferred body side for side view
  activeSide: ActiveSide;
  
  // Smoothing factor for exponential moving average (0.1 = very heavy smoothing, 0.9 = fast/raw)
  smoothingFactor: number;
  
  // Strictness: enforce feet flat on floor during descent & bottom
  enforceFootFlat: boolean;

  // Audio cue settings
  enableSoundEffects: boolean;
  enableVoiceCoach: boolean;
}

export interface LiveBiomechanics {
  currentKneeAngle: number | null;
  currentHipAngle: number | null;
  torsoLeanAngle: number | null;
  kneeValgusRatio: number | null;
  sittingStatus: SittingStatus;
  isFootFlat: boolean | null;
  heelElevationDelta: number | null;
  hipKneeHeightRatio: number | null; // Negative when hip is above knee, positive when hip is below knee
  detectedSide: 'left' | 'right';
  detectedView: 'side' | 'front';
  overallConfidence: number;
  trackingLost: boolean;
  missingLandmarks: string[];
}

export interface SquatAnalysisResult {
  phase: SquatPhase;
  liveBiomechanics: LiveBiomechanics;
  currentFeedback: {
    text: string;
    type: 'neutral' | 'success' | 'warning' | 'alert';
  };
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  recentReps: RepRecord[];
  activeIssues: FormIssue[];
}

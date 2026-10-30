export type PushupPhase = 'TOP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export type FormCheckStatus = 'good' | 'needs_correction' | 'unable_to_assess';

export type RepClassification = 'valid' | 'invalid' | 'needs_review';

export interface FormCategoryCheck {
  status: FormCheckStatus;
  message: string;
  metric?: string;
}

export interface PushupFormChecks {
  hands: FormCategoryCheck;
  elbows: FormCategoryCheck;
  depth: FormCategoryCheck;
  core: FormCategoryCheck;
  legs: FormCategoryCheck;
  neck: FormCategoryCheck;
}

export interface PushupRepRecord {
  id?: string;
  repNumber: number;
  isValid: boolean;
  classification: RepClassification;
  minElbowAngle: number; // Minimum elbow angle reached at bottom
  maxTrunkDeviation: number; // Max deviation from straight 180° plank
  durationMs: number;
  startTime: number;
  endTime: number;
  issues: string[];
  categoryStatuses: {
    hands: FormCheckStatus;
    elbows: FormCheckStatus;
    depth: FormCheckStatus;
    core: FormCheckStatus;
    legs: FormCheckStatus;
    neck: FormCheckStatus;
  };
}

export interface PushupConfig {
  // Target elbow angle at bottom (90° = standard 90-degree push-up, 80° = chest-to-floor)
  targetBottomElbowAngle: number;

  // Elbow extension required to complete rep and lock out at top (typically 155°-165°)
  topElbowExtensionAngle: number;

  // Angle where descent officially starts
  descentStartAngle: number;

  // Maximum allowed core/hip deviation from 180° straight line (degrees)
  maxTrunkDeviationAngle: number;

  // Minimum landmark confidence score
  minLandmarkConfidence: number;

  // Camera view angle preference
  viewMode: 'side' | 'front' | 'auto';

  // Preferred arm side
  activeSide: 'auto' | 'left' | 'right';

  // Smoothing factor
  smoothingFactor: number;

  // Audio settings
  enableSoundEffects: boolean;
  enableVoiceCoach: boolean;

  // Strict lockout requirement
  requireStrictLockout?: boolean;

  // Visual overlay mode for viewing real body: 'full' | 'minimal' | 'off'
  overlayMode?: 'full' | 'minimal' | 'off';
}

export interface LivePushupBiomechanics {
  currentElbowAngle: number | null;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  trunkAlignmentAngle: number | null; // 180° = perfect straight line
  trunkDeviationAngle: number | null; // Deviation from 180° (0° = straight)
  kneeAngle: number | null;
  detectedSide: 'left' | 'right';
  primarySide?: 'left' | 'right';
  detectedView: 'side' | 'front';
  overallConfidence: number;
  trackingLost: boolean;
  missingLandmarks: string[];
  formChecks: PushupFormChecks;
  overallStatus: 'good' | 'warning' | 'alert' | 'unable';
  overallFeedback: string;
}

export interface HistoryRepItem {
  repNumber: number;
  isValid: boolean;
  minAngle: number; // minKneeAngle for squats, minElbowAngle for push-ups
  durationMs: number;
  issues: string[];
}

export interface WorkoutHistorySession {
  id: string;
  exerciseType: 'squat' | 'pushup';
  timestamp: number; // Epoch timestamp in ms
  dateFormatted: string; // e.g. "Oct 30, 2026"
  timeFormatted: string; // e.g. "12:45 AM"
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  accuracyPercent: number;
  durationSeconds: number;
  avgDepth: number | null;
  avgTempoSec: string | null;
  targetDepthAngle: number;
  warningsSummary: { issue: string; count: number }[];
  reps: HistoryRepItem[];
}

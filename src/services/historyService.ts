import { WorkoutHistorySession, HistoryRepItem } from '../types/history';
import { RepRecord } from '../types/squat';
import { PushupRepRecord } from '../types/pushup';

const STORAGE_KEY = 'formpulse_workout_history_v1';
const EVENT_NAME = 'formpulse_history_updated';

const MAX_SESSIONS = 100;
const MAX_REPS_PER_SESSION = 1000;
const MAX_STR = 120;
const MAX_STORAGE_CHARS = 5_000_000;

const num = (v: unknown, min: number, max: number, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v.slice(0, MAX_STR) : fallback;

/**
 * localStorage is untrusted input (editable by the user, extensions, or other
 * scripts on the same origin). Rebuild every record from validated primitives.
 */
function sanitizeSession(raw: unknown): WorkoutHistorySession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.exerciseType !== 'squat' && r.exerciseType !== 'pushup') return null;
  const id = str(r.id);
  if (!id) return null;

  const reps: HistoryRepItem[] = (Array.isArray(r.reps) ? r.reps : [])
    .slice(0, MAX_REPS_PER_SESSION)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      repNumber: num(x.repNumber, 0, 100000),
      isValid: x.isValid === true,
      minAngle: num(x.minAngle, 0, 360),
      durationMs: num(x.durationMs, 0, 3_600_000),
      issues: (Array.isArray(x.issues) ? x.issues : [])
        .slice(0, 20)
        .filter((i): i is string => typeof i === 'string')
        .map((i) => i.slice(0, MAX_STR)),
    }));

  const warningsSummary = (Array.isArray(r.warningsSummary) ? r.warningsSummary : [])
    .slice(0, 50)
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
    .map((w) => ({ issue: str(w.issue), count: num(w.count, 0, 100000) }));

  return {
    id,
    exerciseType: r.exerciseType,
    timestamp: num(r.timestamp, 0, 8.64e15),
    dateFormatted: str(r.dateFormatted),
    timeFormatted: str(r.timeFormatted),
    validReps: num(r.validReps, 0, 100000),
    totalAttempts: num(r.totalAttempts, 0, 100000),
    rejectedReps: num(r.rejectedReps, 0, 100000),
    accuracyPercent: num(r.accuracyPercent, 0, 100),
    durationSeconds: num(r.durationSeconds, 0, 86400 * 7),
    avgDepth: r.avgDepth === null ? null : num(r.avgDepth, 0, 360),
    avgTempoSec: typeof r.avgTempoSec === 'string' && /^\d{1,5}(\.\d{1,2})?$/.test(r.avgTempoSec) ? r.avgTempoSec : null,
    targetDepthAngle: num(r.targetDepthAngle, 0, 360),
    warningsSummary,
    reps,
  };
}


export class HistoryService {
  private lastSavedFingerprint = '';
  private lastSavedTimestamp = 0;

  /**
   * Retrieves all workout session logs from localStorage, sorted newest first.
   */
  public getAllSessions(): WorkoutHistorySession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      if (data.length > MAX_STORAGE_CHARS) return [];
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(0, MAX_SESSIONS)
        .map(sanitizeSession)
        .filter((x): x is WorkoutHistorySession => x !== null)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn('Failed to parse workout history from localStorage', e);
      return [];
    }
  }

  /**
   * Retrieves sessions filtered by exercise type ('squat' or 'pushup').
   */
  public getSessionsByExercise(exercise: 'squat' | 'pushup'): WorkoutHistorySession[] {
    return this.getAllSessions().filter((s) => s.exerciseType === exercise);
  }

  /**
   * Saves a squat session into persistent history.
   */
  public saveSquatSession({
    validReps,
    totalAttempts,
    rejectedReps,
    reps,
    durationSeconds,
    targetDepthAngle,
  }: {
    validReps: number;
    totalAttempts: number;
    rejectedReps: number;
    reps: RepRecord[];
    durationSeconds: number;
    targetDepthAngle: number;
  }): WorkoutHistorySession | null {
    // Only record sessions where at least 1 attempt or valid rep was made, or duration > 5s with reps
    if (totalAttempts === 0 && validReps === 0 && reps.length === 0) {
      return null;
    }

    const fingerprint = `squat-${validReps}-${totalAttempts}-${reps.length}`;
    const now = Date.now();
    // Debounce to prevent duplicate saves within 5 seconds
    if (this.lastSavedFingerprint === fingerprint && now - this.lastSavedTimestamp < 5000) {
      return null;
    }

    const warningCounts: Record<string, number> = {};
    let totalDepthSum = 0;
    let totalDurationSum = 0;
    let validCount = 0;

    const repItems: HistoryRepItem[] = reps.map((r) => {
      if (r.isValid) {
        totalDepthSum += r.minKneeAngle;
        totalDurationSum += r.durationMs;
        validCount += 1;
      }
      for (const iss of r.issues) {
        let key = iss;
        if (iss.startsWith('Insufficient depth')) key = 'Insufficient depth';
        if (iss.startsWith('Excessive forward lean')) key = 'Excessive forward lean';
        warningCounts[key] = (warningCounts[key] || 0) + 1;
      }
      return {
        repNumber: r.repNumber,
        isValid: r.isValid,
        minAngle: r.minKneeAngle,
        durationMs: r.durationMs,
        issues: [...r.issues],
      };
    });

    const avgDepth = validCount > 0 ? Math.round(totalDepthSum / validCount) : null;
    const avgTempoSec = validCount > 0 ? (totalDurationSum / validCount / 1000).toFixed(1) : null;
    const accuracyPercent =
      totalAttempts > 0 ? Math.round((validReps / totalAttempts) * 100) : 100;

    const warningsSummary = Object.entries(warningCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    const dateObj = new Date(now);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });

    const session: WorkoutHistorySession = {
      id: `session_squat_${now}`,
      exerciseType: 'squat',
      timestamp: now,
      dateFormatted,
      timeFormatted,
      validReps,
      totalAttempts,
      rejectedReps,
      accuracyPercent,
      durationSeconds,
      avgDepth,
      avgTempoSec,
      targetDepthAngle,
      warningsSummary,
      reps: repItems,
    };

    this.persistSession(session);
    this.lastSavedFingerprint = fingerprint;
    this.lastSavedTimestamp = now;
    return session;
  }

  /**
   * Saves a push-up session into persistent history.
   */
  public savePushupSession({
    validReps,
    totalAttempts,
    rejectedReps,
    reps,
    durationSeconds,
    targetBottomElbowAngle,
  }: {
    validReps: number;
    totalAttempts: number;
    rejectedReps: number;
    reps: PushupRepRecord[];
    durationSeconds: number;
    targetBottomElbowAngle: number;
  }): WorkoutHistorySession | null {
    // Only record sessions where at least 1 attempt or valid rep was made
    if (totalAttempts === 0 && validReps === 0 && reps.length === 0) {
      return null;
    }

    const fingerprint = `pushup-${validReps}-${totalAttempts}-${reps.length}`;
    const now = Date.now();
    // Debounce to prevent duplicate saves within 5 seconds
    if (this.lastSavedFingerprint === fingerprint && now - this.lastSavedTimestamp < 5000) {
      return null;
    }

    const warningCounts: Record<string, number> = {};
    let totalDepthSum = 0;
    let totalDurationSum = 0;
    let validCount = 0;

    const repItems: HistoryRepItem[] = reps.map((r) => {
      if (r.isValid) {
        totalDepthSum += r.minElbowAngle;
        totalDurationSum += r.durationMs;
        validCount += 1;
      }
      for (const iss of r.issues) {
        warningCounts[iss] = (warningCounts[iss] || 0) + 1;
      }
      return {
        repNumber: r.repNumber,
        isValid: r.isValid,
        minAngle: r.minElbowAngle,
        durationMs: r.durationMs,
        issues: [...r.issues],
      };
    });

    const avgDepth = validCount > 0 ? Math.round(totalDepthSum / validCount) : null;
    const avgTempoSec = validCount > 0 ? (totalDurationSum / validCount / 1000).toFixed(1) : null;
    const accuracyPercent =
      totalAttempts > 0 ? Math.round((validReps / totalAttempts) * 100) : 100;

    const warningsSummary = Object.entries(warningCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    const dateObj = new Date(now);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });

    const session: WorkoutHistorySession = {
      id: `session_pushup_${now}`,
      exerciseType: 'pushup',
      timestamp: now,
      dateFormatted,
      timeFormatted,
      validReps,
      totalAttempts,
      rejectedReps,
      accuracyPercent,
      durationSeconds,
      avgDepth,
      avgTempoSec,
      targetDepthAngle: targetBottomElbowAngle,
      warningsSummary,
      reps: repItems,
    };

    this.persistSession(session);
    this.lastSavedFingerprint = fingerprint;
    this.lastSavedTimestamp = now;
    return session;
  }

  /**
   * Persists the session into localStorage and notifies subscribers.
   */
  private persistSession(session: WorkoutHistorySession) {
    try {
      const all = this.getAllSessions();
      // Keep up to 100 recent sessions
      const updated = [session, ...all.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.notifySubscribers();
    } catch (e) {
      console.warn('Could not save workout session to localStorage', e);
    }
  }

  /**
   * Deletes a specific session by ID.
   */
  public deleteSession(id: string) {
    try {
      const all = this.getAllSessions().filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      this.notifySubscribers();
    } catch (e) {
      console.warn('Could not delete session from localStorage', e);
    }
  }

  /**
   * Clears sessions (either for an exercise type or completely).
   */
  public clearHistory(exerciseType?: 'squat' | 'pushup') {
    try {
      if (exerciseType) {
        const remaining = this.getAllSessions().filter((s) => s.exerciseType !== exerciseType);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      this.notifySubscribers();
    } catch (e) {
      console.warn('Could not clear workout history', e);
    }
  }

  /**
   * Subscribes to storage updates across components.
   */
  public subscribe(callback: () => void): () => void {
    const handleCustomEvent = () => callback();
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  private notifySubscribers() {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export const historyService = new HistoryService();

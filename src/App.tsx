import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { WorkoutDashboard } from './components/WorkoutDashboard';
import { RepHistoryLog } from './components/RepHistoryLog';
import { WorkoutHistorySection } from './components/WorkoutHistorySection';
import { WorkoutHistoryModal } from './components/WorkoutHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { BiomechanicsGuideModal } from './components/BiomechanicsGuideModal';

import { PushupDashboard } from './components/PushupDashboard';
import { PushupRepHistoryLog } from './components/PushupRepHistoryLog';
import { PushupSettingsModal } from './components/PushupSettingsModal';
import { PushupGuideModal } from './components/PushupGuideModal';
import { IntroSplash } from './components/IntroSplash';

import { SquatStateMachine } from './services/squatStateMachine';
import { DEFAULT_SQUAT_CONFIG } from './config/thresholds';
import {
  FormIssue,
  Keypoint,
  LiveBiomechanics,
  RepRecord,
  SquatConfig,
  SquatPhase,
} from './types/squat';

import { PushupStateMachine } from './services/pushupStateMachine';
import { DEFAULT_PUSHUP_CONFIG } from './config/pushupThresholds';
import {
  PushupConfig,
  PushupPhase,
  LivePushupBiomechanics,
  PushupRepRecord,
  FormCategoryCheck,
} from './types/pushup';
import { historyService } from './services/historyService';

import { HelpCircle, Sparkles } from 'lucide-react';

export default function App() {
  // Exercise Mode: 'squat' | 'pushup'
  const [activeExercise, setActiveExercise] = useState<'squat' | 'pushup'>('squat');

  // ==================== SQUAT STATE (COMPLETELY PRESERVED) ====================
  const [config, setConfig] = useState<SquatConfig>(DEFAULT_SQUAT_CONFIG);
  const stateMachineRef = useRef<SquatStateMachine>(new SquatStateMachine(DEFAULT_SQUAT_CONFIG));

  const [phase, setPhase] = useState<SquatPhase>('STANDING');
  const [liveBiomechanics, setLiveBiomechanics] = useState<LiveBiomechanics | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<{
    text: string;
    type: 'neutral' | 'success' | 'warning' | 'alert';
  }>({
    text: 'Stand upright facing camera to begin',
    type: 'neutral',
  });
  const [validReps, setValidReps] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [rejectedReps, setRejectedReps] = useState<number>(0);
  const [reps, setReps] = useState<RepRecord[]>([]);
  const [activeIssues, setActiveIssues] = useState<FormIssue[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  // ==================== PUSH-UP STATE (DEDICATED & INDEPENDENT) ====================
  const [pushupConfig, setPushupConfig] = useState<PushupConfig>(DEFAULT_PUSHUP_CONFIG);
  const pushupStateMachineRef = useRef<PushupStateMachine>(
    new PushupStateMachine(DEFAULT_PUSHUP_CONFIG)
  );

  const [pushupPhase, setPushupPhase] = useState<PushupPhase>('TOP');
  const [pushupBiomechanics, setPushupBiomechanics] = useState<LivePushupBiomechanics | null>(null);
  const [pushupFeedback, setPushupFeedback] = useState<{
    text: string;
    type: 'neutral' | 'success' | 'warning' | 'alert';
  }>({
    text: 'Assume a front/side plank position facing the camera',
    type: 'neutral',
  });
  const [pushupFormChecks, setPushupFormChecks] = useState<{
    hands: FormCategoryCheck;
    elbows: FormCategoryCheck;
    depth: FormCategoryCheck;
    core: FormCategoryCheck;
    legs: FormCategoryCheck;
    neck: FormCategoryCheck;
  } | null>(null);
  const [pushupValidReps, setPushupValidReps] = useState<number>(0);
  const [pushupTotalAttempts, setPushupTotalAttempts] = useState<number>(0);
  const [pushupRejectedReps, setPushupRejectedReps] = useState<number>(0);
  const [pushupReps, setPushupReps] = useState<PushupRepRecord[]>([]);
  const [pushupSessionSeconds, setPushupSessionSeconds] = useState<number>(0);

  // ==================== SHARED CONTROLS & TIMERS ====================
  const [fps, setFps] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('formpulse_intro_seen');
    } catch {
      return false;
    }
  });

  const handleDismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      sessionStorage.setItem('formpulse_intro_seen', 'true');
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  // Keep history count updated
  useEffect(() => {
    const updateCount = () => {
      setHistoryCount(historyService.getAllSessions().length);
    };
    updateCount();
    const unsub = historyService.subscribe(updateCount);
    return () => unsub();
  }, []);

  // Active workout stopwatch - ticks only when camera is actively streaming and not paused
  useEffect(() => {
    if (!isCameraActive || isPaused) return;

    const interval = setInterval(() => {
      if (activeExercise === 'squat') {
        setSessionSeconds((prev) => prev + 1);
      } else {
        setPushupSessionSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCameraActive, isPaused, activeExercise]);

  // Frame processing router: delegates to the active exercise state machine
  const handleFrameProcessed = useCallback(
    (keypoints: Keypoint[] | null) => {
      if (isPaused) return;

      if (activeExercise === 'squat') {
        const result = stateMachineRef.current.processFrame(keypoints);
        setPhase(result.phase);
        setLiveBiomechanics(result.liveBiomechanics);
        setCurrentFeedback(result.currentFeedback);
        setValidReps(result.validReps);
        setTotalAttempts(result.totalAttempts);
        setRejectedReps(result.rejectedReps);
        setReps(result.recentReps);
        setActiveIssues(result.activeIssues);
      } else {
        const result = pushupStateMachineRef.current.processFrame(keypoints);
        setPushupPhase(result.phase);
        setPushupBiomechanics(result.liveBiomechanics);
        setPushupFeedback(result.currentFeedback);
        setPushupFormChecks(result.liveBiomechanics?.formChecks || null);
        setPushupValidReps(result.validReps);
        setPushupTotalAttempts(result.totalAttempts);
        setPushupRejectedReps(result.invalidReps);
        setPushupReps(result.recentReps);
      }
    },
    [isPaused, activeExercise]
  );

  // Squat configuration handler
  const handleUpdateConfig = useCallback((newConfig: Partial<SquatConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      stateMachineRef.current.updateConfig(updated);
      return updated;
    });
  }, []);

  // Push-up configuration handler
  const handleUpdatePushupConfig = useCallback((newConfig: Partial<PushupConfig>) => {
    setPushupConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      pushupStateMachineRef.current.updateConfig(updated);
      return updated;
    });
  }, []);

  // Keep a stable ref of live session values to avoid recreating save handlers every second
  const sessionDataRef = useRef({
    validReps,
    totalAttempts,
    rejectedReps,
    reps,
    sessionSeconds,
    targetDepthAngle: config.targetDepthAngle,
    pushupValidReps,
    pushupTotalAttempts,
    pushupRejectedReps,
    pushupReps,
    pushupSessionSeconds,
    targetBottomElbowAngle: pushupConfig.targetBottomElbowAngle,
  });

  useEffect(() => {
    sessionDataRef.current = {
      validReps,
      totalAttempts,
      rejectedReps,
      reps,
      sessionSeconds,
      targetDepthAngle: config.targetDepthAngle,
      pushupValidReps,
      pushupTotalAttempts,
      pushupRejectedReps,
      pushupReps,
      pushupSessionSeconds,
      targetBottomElbowAngle: pushupConfig.targetBottomElbowAngle,
    };
  });

  // Persistent History saving helpers (stable callback identities)
  const handleSaveSquatSession = useCallback(() => {
    const data = sessionDataRef.current;
    if (data.validReps === 0 && data.totalAttempts === 0 && data.reps.length === 0) return;
    historyService.saveSquatSession({
      validReps: data.validReps,
      totalAttempts: data.totalAttempts,
      rejectedReps: data.rejectedReps,
      reps: data.reps,
      durationSeconds: data.sessionSeconds,
      targetDepthAngle: data.targetDepthAngle,
    });
  }, []);

  const handleSavePushupSession = useCallback(() => {
    const data = sessionDataRef.current;
    if (data.pushupValidReps === 0 && data.pushupTotalAttempts === 0 && data.pushupReps.length === 0) return;
    historyService.savePushupSession({
      validReps: data.pushupValidReps,
      totalAttempts: data.pushupTotalAttempts,
      rejectedReps: data.pushupRejectedReps,
      reps: data.pushupReps,
      durationSeconds: data.pushupSessionSeconds,
      targetBottomElbowAngle: data.targetBottomElbowAngle,
    });
  }, []);

  // Reset active session with history preservation
  const handleResetSession = useCallback(() => {
    if (activeExercise === 'squat') {
      handleSaveSquatSession();
      stateMachineRef.current.resetSession();
      setPhase('STANDING');
      setLiveBiomechanics(null);
      setCurrentFeedback({
        text: 'Session reset. Stand upright to start.',
        type: 'neutral',
      });
      setValidReps(0);
      setTotalAttempts(0);
      setRejectedReps(0);
      setReps([]);
      setActiveIssues([]);
      setSessionSeconds(0);
    } else {
      handleSavePushupSession();
      pushupStateMachineRef.current.resetSession();
      setPushupPhase('TOP');
      setPushupBiomechanics(null);
      setPushupFeedback({
        text: 'Session reset. Assume a plank position to begin.',
        type: 'neutral',
      });
      setPushupFormChecks(null);
      setPushupValidReps(0);
      setPushupTotalAttempts(0);
      setPushupRejectedReps(0);
      setPushupReps([]);
      setPushupSessionSeconds(0);
    }
  }, [activeExercise, handleSaveSquatSession, handleSavePushupSession]);

  // Master sound toggle
  const handleToggleSound = useCallback(() => {
    if (activeExercise === 'squat') {
      handleUpdateConfig({ enableSoundEffects: !config.enableSoundEffects });
    } else {
      handleUpdatePushupConfig({ enableSoundEffects: !pushupConfig.enableSoundEffects });
    }
  }, [
    activeExercise,
    config.enableSoundEffects,
    pushupConfig.enableSoundEffects,
    handleUpdateConfig,
    handleUpdatePushupConfig,
  ]);

  // Handle End Workout with auto-save
  const handleEndWorkout = useCallback(() => {
    if (activeExercise === 'squat') {
      handleSaveSquatSession();
    } else {
      handleSavePushupSession();
    }
    setIsSummaryOpen(true);
  }, [activeExercise, handleSaveSquatSession, handleSavePushupSession]);

  // Handle camera off with auto-save (completely stable callback)
  const handleCameraStateChange = useCallback(
    (active: boolean) => {
      setIsCameraActive(active);
      if (!active) {
        if (activeExercise === 'squat') {
          handleSaveSquatSession();
        } else {
          handleSavePushupSession();
        }
      }
    },
    [activeExercise, handleSaveSquatSession, handleSavePushupSession]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Cinematic Intro Animation on launch / replay */}
      {showIntro && <IntroSplash onComplete={handleDismissIntro} />}

      {/* Top Bar Contract (1 row, 3 zones) */}
      <Header
        activeExercise={activeExercise}
        onSelectExercise={setActiveExercise}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onResetSession={handleResetSession}
        onReplayIntro={() => setShowIntro(true)}
        soundEnabled={
          activeExercise === 'squat'
            ? config.enableSoundEffects
            : pushupConfig.enableSoundEffects
        }
        onToggleSound={handleToggleSound}
        fps={isCameraActive ? fps : 0}
        cameraActive={isCameraActive && !isPaused}
        historyCount={historyCount}
      />

      {/* Main Responsive Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 flex flex-col gap-4 sm:gap-6">
        {/* Subtitle & Guide Link Strip */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap pb-2 border-b border-slate-900">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display">
              {activeExercise === 'squat'
                ? 'Real-Time Squat Form Analyzer'
                : 'Real-Time Push-Up Form Analyzer'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeExercise === 'squat'
                ? 'MoveNet Lightning biomechanical state machine with persistent date & time session logs.'
                : '6-point MoveNet kinematic analysis with strict depth, plank line, and chronological history.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 min-h-[36px]"
            >
              <span>View History</span>
              {historyCount > 0 && (
                <span className="bg-sky-500/20 text-sky-400 font-mono-numbers px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 min-h-[36px]"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {activeExercise === 'squat' ? 'Squat Guide' : 'Push-Up Guide'}
              </span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Stacked on mobile & tablet (<lg), 2 columns on desktop (>=lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Left / Primary Column: Camera & Overlay Viewport */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <CameraView
              activeExercise={activeExercise}
              // Squat props
              config={config}
              phase={phase}
              feedback={currentFeedback}
              biomechanics={liveBiomechanics}
              activeIssues={activeIssues}
              validReps={validReps}
              totalAttempts={totalAttempts}
              rejectedReps={rejectedReps}
              recentReps={reps}
              // Push-up props
              pushupConfig={pushupConfig}
              pushupPhase={pushupPhase}
              pushupFeedback={pushupFeedback}
              pushupBiomechanics={pushupBiomechanics}
              pushupFormChecks={pushupFormChecks}
              pushupValidReps={pushupValidReps}
              pushupTotalAttempts={pushupTotalAttempts}
              pushupRejectedReps={pushupRejectedReps}
              pushupRecentReps={pushupReps}
              // Shared props
              onFrameProcessed={handleFrameProcessed}
              onFpsUpdate={setFps}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused((prev) => !prev)}
              isCameraActive={isCameraActive}
              onCameraStateChange={handleCameraStateChange}
              sessionSeconds={
                activeExercise === 'squat' ? sessionSeconds : pushupSessionSeconds
              }
              onStartNewSession={handleResetSession}
            />

            {/* Quick Helper Tips */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {activeExercise === 'squat' ? (
                  <>
                    <strong className="text-slate-200">How squat reps are counted:</strong> Stand
                    upright to calibrate the baseline (~162°). Sink down until your hip crease breaks
                    or matches parallel (≤{config.targetDepthAngle}°), then drive back up to full
                    standing. Incomplete or shallow descents are flagged and rejected. Completed
                    sessions are saved to History by date and time.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-200">How push-up reps are counted:</strong> Assume
                    a straight plank position (lockout ≥{pushupConfig.topElbowExtensionAngle}°).
                    Lower until your elbows flex to ≤{pushupConfig.targetBottomElbowAngle}°,
                    maintaining spine deviation within {pushupConfig.maxTrunkDeviationAngle}°. Push
                    back up to full lockout. Completed sessions are saved to History by date and time.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Workout Metrics, Biomechanics Gauges, Persistent History & Live Rep Log */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            {activeExercise === 'squat' ? (
              <>
                <WorkoutDashboard
                  validReps={validReps}
                  totalAttempts={totalAttempts}
                  rejectedReps={rejectedReps}
                  phase={phase}
                  biomechanics={liveBiomechanics}
                  activeIssues={activeIssues}
                  config={config}
                  isPaused={isPaused}
                  isCameraActive={isCameraActive}
                  sessionSeconds={sessionSeconds}
                  onEndWorkout={handleEndWorkout}
                />

                {/* Dedicated Squat History Section with chronological Date & Time records */}
                <WorkoutHistorySection
                  exerciseType="squat"
                  currentValidReps={validReps}
                  currentTotalAttempts={totalAttempts}
                  currentRejectedReps={rejectedReps}
                  canSaveCurrentSession={validReps > 0 || totalAttempts > 0}
                  onSaveCurrentSession={handleSaveSquatSession}
                />

                <RepHistoryLog reps={reps} />
              </>
            ) : (
              <>
                <PushupDashboard
                  validReps={pushupValidReps}
                  totalAttempts={pushupTotalAttempts}
                  rejectedReps={pushupRejectedReps}
                  phase={pushupPhase}
                  biomechanics={pushupBiomechanics}
                  formChecks={pushupFormChecks}
                  config={pushupConfig}
                  isPaused={isPaused}
                  isCameraActive={isCameraActive}
                  sessionSeconds={pushupSessionSeconds}
                  onEndWorkout={handleEndWorkout}
                />

                {/* Dedicated Push-Up History Section with chronological Date & Time records */}
                <WorkoutHistorySection
                  exerciseType="pushup"
                  currentValidReps={pushupValidReps}
                  currentTotalAttempts={pushupTotalAttempts}
                  currentRejectedReps={pushupRejectedReps}
                  canSaveCurrentSession={pushupValidReps > 0 || pushupTotalAttempts > 0}
                  onSaveCurrentSession={handleSavePushupSession}
                />

                <PushupRepHistoryLog reps={pushupReps} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {activeExercise === 'squat' ? (
        <>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={config}
            onSaveConfig={handleUpdateConfig}
          />
          <BiomechanicsGuideModal
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
          />
        </>
      ) : (
        <>
          <PushupSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={pushupConfig}
            onSaveConfig={handleUpdatePushupConfig}
          />
          <PushupGuideModal
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
          />
        </>
      )}

      {/* Full Workout History Modal */}
      <WorkoutHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        activeExercise={activeExercise}
      />

      <SessionSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onStartNewSession={handleResetSession}
        exerciseType={activeExercise}
        reps={reps}
        pushupReps={pushupReps}
        validReps={activeExercise === 'squat' ? validReps : pushupValidReps}
        totalAttempts={activeExercise === 'squat' ? totalAttempts : pushupTotalAttempts}
        rejectedReps={activeExercise === 'squat' ? rejectedReps : pushupRejectedReps}
      />
    </div>
  );
}

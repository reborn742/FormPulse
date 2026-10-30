import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  RotateCcw,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Video,
  Award,
  Timer,
  TrendingDown,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import {
  FormIssue,
  Keypoint,
  LiveBiomechanics,
  RepRecord,
  SquatConfig,
  SquatPhase,
} from '../types/squat';
import {
  PushupPhase,
  LivePushupBiomechanics,
  PushupConfig,
  PushupRepRecord,
  FormCategoryCheck,
} from '../types/pushup';
import { poseDetectorService } from '../services/poseDetector';
import { renderPoseOverlay } from '../utils/canvasRenderer';
import { renderPushupOverlay } from '../utils/pushupCanvasRenderer';
import { DemoPoseGenerator, DemoMotionType } from '../services/demoPoseGenerator';
import { DemoPushupGenerator, DemoPushupMotionType } from '../services/demoPushupGenerator';

interface CameraViewProps {
  activeExercise?: 'squat' | 'pushup';
  // Squat props
  config: SquatConfig;
  phase: SquatPhase;
  feedback: { text: string; type: 'neutral' | 'success' | 'warning' | 'alert' };
  biomechanics: LiveBiomechanics | null;
  activeIssues: FormIssue[];
  validReps: number;
  totalAttempts: number;
  rejectedReps: number;
  recentReps: RepRecord[];

  // Push-up props
  pushupConfig?: PushupConfig;
  pushupPhase?: PushupPhase;
  pushupFeedback?: { text: string; type: 'neutral' | 'success' | 'warning' | 'alert' };
  pushupBiomechanics?: LivePushupBiomechanics | null;
  pushupFormChecks?: {
    hands: FormCategoryCheck;
    elbows: FormCategoryCheck;
    depth: FormCategoryCheck;
    core: FormCategoryCheck;
    legs: FormCategoryCheck;
    neck: FormCategoryCheck;
  } | null;
  pushupValidReps?: number;
  pushupTotalAttempts?: number;
  pushupRejectedReps?: number;
  pushupRecentReps?: PushupRepRecord[];

  // Shared props
  onFrameProcessed: (keypoints: Keypoint[] | null) => void;
  onFpsUpdate: (fps: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  isCameraActive: boolean;
  onCameraStateChange: (active: boolean) => void;
  sessionSeconds: number;
  onStartNewSession: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  activeExercise = 'squat',
  config,
  phase,
  feedback,
  biomechanics,
  activeIssues,
  validReps,
  totalAttempts,
  rejectedReps,
  recentReps,
  pushupConfig,
  pushupPhase = 'TOP',
  pushupFeedback = { text: 'Assume a plank position to begin', type: 'neutral' },
  pushupBiomechanics = null,
  pushupFormChecks = null,
  pushupValidReps = 0,
  pushupTotalAttempts = 0,
  pushupRejectedReps = 0,
  pushupRecentReps = [],
  onFrameProcessed,
  onFpsUpdate,
  isPaused,
  onTogglePause,
  isCameraActive,
  onCameraStateChange,
  sessionSeconds,
  onStartNewSession,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingModel, setIsInitializingModel] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Flag to ensure auto-start happens ONLY once on initial mount and never after user stop
  const hasAutoStartedRef = useRef<boolean>(false);
  const userStoppedCameraRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // Interactive Demo/Synthetic Test Mode for testing without physical webcam
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoMotion, setDemoMotion] = useState<DemoMotionType>('perfect_squat');
  const demoGeneratorRef = useRef<DemoPoseGenerator>(new DemoPoseGenerator());

  const [demoPushupMotion, setDemoPushupMotion] = useState<DemoPushupMotionType>('perfect_pushup');
  const demoPushupGeneratorRef = useRef<DemoPushupGenerator>(new DemoPushupGenerator());

  // Push-up overlay mode: 'minimal' (Clean body view, default) | 'off' (pure camera video only) | 'full' (detailed arcs)
  const [pushupOverlayMode, setPushupOverlayMode] = useState<'minimal' | 'full' | 'off'>('minimal');

  // Peripheral flash on valid rep completion (for non-disruptive feedback on the floor)
  const [showRepFlash, setShowRepFlash] = useState<boolean>(false);
  const prevValidRepsRef = useRef<number>(pushupValidReps);

  useEffect(() => {
    if (pushupValidReps > prevValidRepsRef.current) {
      setShowRepFlash(true);
      const timer = setTimeout(() => setShowRepFlash(false), 700);
      prevValidRepsRef.current = pushupValidReps;
      return () => clearTimeout(timer);
    }
    prevValidRepsRef.current = pushupValidReps;
  }, [pushupValidReps]);

  // Screen Wake Lock API to prevent phone/tablet/laptop screen from dimming/sleeping during floor workouts
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && isCameraActive && !isPaused) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Ignored if wake lock is restricted by browser policy
      }
    };

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isCameraActive && !isPaused) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
    };
  }, [isCameraActive, isPaused]);

  const animationFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);

  // Store latest props in a ref to decouple them from the RAF loop's lifecycle
  const latestPropsRef = useRef({
    activeExercise,
    biomechanics,
    phase,
    activeIssues,
    config,
    pushupBiomechanics,
    pushupPhase,
    pushupFormChecks,
    pushupConfig,
    isPaused,
    isMirrored,
    pushupOverlayMode,
    onFrameProcessed,
    onFpsUpdate,
  });

  useEffect(() => {
    latestPropsRef.current = {
      activeExercise,
      biomechanics,
      phase,
      activeIssues,
      config,
      pushupBiomechanics,
      pushupPhase,
      pushupFormChecks,
      pushupConfig,
      isPaused,
      isMirrored,
      pushupOverlayMode,
      onFrameProcessed,
      onFpsUpdate,
    };
  });

  // Initialize MoveNet model
  useEffect(() => {
    let mounted = true;
    const initModel = async () => {
      try {
        setIsInitializingModel(true);
        setModelError(null);
        await poseDetectorService.initialize();
        if (mounted) {
          setIsInitializingModel(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('MoveNet init failed:', err);
          setModelError('Failed to load the pose model. Check your connection and that WebGL is supported, then retry.');
          setIsInitializingModel(false);
        }
      }
    };

    initModel();
    return () => {
      mounted = false;
    };
  }, []);

  // Enumerate available camera devices
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      }
    } catch {
      // Ignore device enumeration restrictions
    }
  }, [selectedDeviceId]);

  // Start live webcam stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsDemoMode(false);
    userStoppedCameraRef.current = false;

    // Stop any existing tracks first
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (getUserMedia) is not supported in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          facingMode: selectedDeviceId ? undefined : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Register unexpected track termination handler (e.g. system sleep/interruption)
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (!userStoppedCameraRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            console.warn('Camera video track ended unexpectedly. Attempting auto-reconnect...');
            startCamera();
          } else if (!userStoppedCameraRef.current) {
            setCameraError('Camera disconnected. Please check your device and press Retry Camera.');
            onCameraStateChange(false);
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        onCameraStateChange(true);
      }

      // Only forgive past reconnects once the stream has stayed up for a while (prevents flapping loops)
      setTimeout(() => {
        if (mediaStreamRef.current === stream) reconnectAttemptsRef.current = 0;
      }, 10000);
      refreshDevices();
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera permissions in your browser URL bar, or click Launch Test Simulation below.');
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setCameraError('No webcam was detected on this device. You can verify squat counting using Test Simulation Mode below.');
      } else {
        setCameraError('Failed to access the camera. Check that no other app is using it and try again.');
      }
      onCameraStateChange(false);
    }
  }, [selectedDeviceId, refreshDevices, onCameraStateChange]);

  // Stop camera stream completely and turn off hardware tracks
  const stopCamera = useCallback(() => {
    userStoppedCameraRef.current = true;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onCameraStateChange(false);
    onFpsUpdate(0);
    onFrameProcessed(null);

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [onCameraStateChange, onFpsUpdate, onFrameProcessed]);

  // Auto-start camera ONCE on initial load after model finishes initializing
  useEffect(() => {
    if (!isInitializingModel && !modelError && !hasAutoStartedRef.current && !userStoppedCameraRef.current && !cameraError && !isDemoMode) {
      hasAutoStartedRef.current = true;
      startCamera();
    }
  }, [isInitializingModel, modelError, cameraError, isDemoMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      userStoppedCameraRef.current = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Main Inference & Canvas Render Loop (Decoupled from fast-changing props for rock-solid stability)
  useEffect(() => {
    let isActive = true;

    const runLoop = async () => {
      if (!isActive) return;

      const props = latestPropsRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Calculate approximate FPS
      frameCountRef.current += 1;
      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        props.onFpsUpdate(currentFps);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      if (!props.isPaused) {
        if (isDemoMode) {
          // In Demo / Synthetic Motion Mode
          const keypoints = props.activeExercise === 'pushup'
            ? demoPushupGeneratorRef.current.nextFrame()
            : demoGeneratorRef.current.nextFrame();

          props.onFrameProcessed(keypoints);

          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = 640;
              canvas.height = 480;

              if (props.activeExercise === 'pushup') {
                renderPushupOverlay({
                  canvas,
                  ctx,
                  keypoints,
                  biomechanics: props.pushupBiomechanics,
                  phase: props.pushupPhase,
                  formChecks: props.pushupFormChecks,
                  targetBottomAngle: props.pushupConfig?.targetBottomElbowAngle || 90,
                  isMirrored: false,
                  minConfidence: 0.3,
                  videoWidth: 640,
                  videoHeight: 480,
                  overlayMode: props.pushupOverlayMode,
                });
              } else {
                renderPoseOverlay({
                  canvas,
                  ctx,
                  keypoints,
                  biomechanics: props.biomechanics,
                  phase: props.phase,
                  activeIssues: props.activeIssues,
                  targetDepthAngle: props.config.targetDepthAngle,
                  isMirrored: false,
                  minConfidence: 0.3,
                  videoWidth: 640,
                  videoHeight: 480,
                });
              }
            }
          }
        } else if (isCameraActive && video && video.readyState >= 2 && canvas) {
          // In Live Camera Mode with concurrency lock to prevent WebGL GPU texture pipeline exhaustion
          if (!isInferringRef.current) {
            isInferringRef.current = true;
            try {
              const vWidth = video.videoWidth || 640;
              const vHeight = video.videoHeight || 480;

              if (canvas.width !== vWidth || canvas.height !== vHeight) {
                canvas.width = vWidth;
                canvas.height = vHeight;
              }

              const pose = await poseDetectorService.estimatePose(video);
              props.onFrameProcessed(pose ? pose.keypoints : null);

              const ctx = canvas.getContext('2d');
              if (ctx) {
                if (props.activeExercise === 'pushup') {
                  renderPushupOverlay({
                    canvas,
                    ctx,
                    keypoints: pose ? pose.keypoints : null,
                    biomechanics: props.pushupBiomechanics,
                    phase: props.pushupPhase,
                    formChecks: props.pushupFormChecks,
                    targetBottomAngle: props.pushupConfig?.targetBottomElbowAngle || 90,
                    isMirrored: props.isMirrored,
                    minConfidence: props.pushupConfig?.minLandmarkConfidence || 0.35,
                    videoWidth: vWidth,
                    videoHeight: vHeight,
                    overlayMode: props.pushupOverlayMode,
                  });
                } else {
                  renderPoseOverlay({
                    canvas,
                    ctx,
                    keypoints: pose ? pose.keypoints : null,
                    biomechanics: props.biomechanics,
                    phase: props.phase,
                    activeIssues: props.activeIssues,
                    targetDepthAngle: props.config.targetDepthAngle,
                    isMirrored: props.isMirrored,
                    minConfidence: props.config.minLandmarkConfidence,
                    videoWidth: vWidth,
                    videoHeight: vHeight,
                  });
                }
              }
            } catch (inferErr) {
              console.warn('Pose estimation frame error caught safely:', inferErr);
            } finally {
              isInferringRef.current = false;
            }
          }
        } else if (!isCameraActive) {
          props.onFrameProcessed(null);
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }

      if (isActive) {
        animationFrameIdRef.current = requestAnimationFrame(runLoop);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(runLoop);

    return () => {
      isActive = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isCameraActive, isDemoMode]);

  // Handle Squat Demo Mode switch
  const handleEnableDemoMode = (motion: DemoMotionType) => {
    stopCamera();
    setIsDemoMode(true);
    setDemoMotion(motion);
    demoGeneratorRef.current.setMotionType(motion);
    setCameraError(null);
  };

  // Handle Push-up Demo Mode switch
  const handleEnablePushupDemoMode = (motion: DemoPushupMotionType) => {
    stopCamera();
    setIsDemoMode(true);
    setDemoPushupMotion(motion);
    demoPushupGeneratorRef.current.setMotionType(motion);
    setCameraError(null);
  };

  const phaseColorMap: Record<SquatPhase, { text: string; bg: string; border: string }> = {
    STANDING: { text: 'text-slate-200', bg: 'bg-slate-900/80', border: 'border-slate-700' },
    DESCENDING: { text: 'text-sky-400', bg: 'bg-sky-950/80', border: 'border-sky-500/50' },
    BOTTOM: { text: 'text-emerald-400', bg: 'bg-emerald-950/80', border: 'border-emerald-500/60' },
    ASCENDING: { text: 'text-amber-400', bg: 'bg-amber-950/80', border: 'border-amber-500/50' },
  };

  const pushupPhaseColorMap: Record<PushupPhase, { text: string; bg: string; border: string }> = {
    TOP: { text: 'text-slate-200', bg: 'bg-slate-900/80', border: 'border-slate-700' },
    DESCENDING: { text: 'text-sky-400', bg: 'bg-sky-950/80', border: 'border-sky-500/50' },
    BOTTOM: { text: 'text-emerald-400', bg: 'bg-emerald-950/80', border: 'border-emerald-500/60' },
    ASCENDING: { text: 'text-amber-400', bg: 'bg-amber-950/80', border: 'border-amber-500/50' },
  };

  const feedbackColorMap = {
    neutral: 'bg-slate-900/90 text-slate-200 border-slate-700',
    success: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
    warning: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
    alert: 'bg-rose-950/90 text-rose-300 border-rose-500/60',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Viewport Frame */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center"
      >
        {/* HTML5 Live Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive && !isDemoMode ? 'opacity-100' : 'opacity-0'
          } ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />

        {/* Demo Mode Background Grid when active */}
        {isDemoMode && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute top-4 left-4 text-xs font-mono text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded border border-sky-500/30">
              TEST MODE: {demoMotion.toUpperCase().replace('_', ' ')}
            </div>
          </div>
        )}

        {/* Dynamic Pose & Skeleton Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Model Loading State */}
        {isInitializingModel && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Loading MoveNet Neural Detector...</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Initializing WebGL pose model for real-time local processing.
            </p>
          </div>
        )}

        {/* Model Loading Error */}
        {modelError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
            <h3 className="text-sm font-semibold text-white">Model Initialization Failed</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">{modelError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-sky-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-sky-400 transition-colors"
            >
              Retry Initialization
            </button>
          </div>
        )}

        {/* Camera Permission Denied or Unavailable State */}
        {/* Camera Permission Denied or Unavailable State */}
        {cameraError && !isDemoMode && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <CameraOff className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="text-base font-semibold text-white">Camera Access Required</h3>
            <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">{cameraError}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-sky-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
              <button
                onClick={() => handleEnableDemoMode('perfect_squat')}
                className="px-4 py-2 bg-slate-800 text-white font-medium text-xs rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-sky-400" />
                Launch Test Simulation
              </button>
            </div>
          </div>
        )}

        {/* Camera Off - Stopped Session Results View */}
        {!isCameraActive && !isDemoMode && !cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-between p-5 sm:p-7 z-20 overflow-y-auto">
            {/* Header Status */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <CameraOff className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-display">
                    {activeExercise === 'pushup'
                      ? 'Camera Off · Push-Up Session Stopped'
                      : 'Camera Off · Session Stopped'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Operation halted. Here are your final workout results and biomechanics.
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-slate-300 font-mono-numbers bg-slate-900 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                {Math.floor(sessionSeconds / 60).toString().padStart(2, '0')}:{(sessionSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Results Grid (Valid Reps, Rep Accuracy, Incomplete, Session Time) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 my-4">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Valid Reps</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-numbers mt-1.5">
                  {activeExercise === 'pushup' ? pushupValidReps : validReps}
                </div>
                <div className="text-[10px] text-emerald-400/90 mt-1 font-mono-numbers">
                  {activeExercise === 'pushup'
                    ? `Target: ≤${pushupConfig?.targetBottomElbowAngle || 90}°`
                    : `Target: ≤${config.targetDepthAngle}°`}
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Rep Accuracy</span>
                  <Award className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-numbers mt-1.5">
                  {activeExercise === 'pushup'
                    ? pushupTotalAttempts > 0
                      ? Math.round((pushupValidReps / pushupTotalAttempts) * 100)
                      : 100
                    : totalAttempts > 0
                    ? Math.round((validReps / totalAttempts) * 100)
                    : 100}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono-numbers">
                  {activeExercise === 'pushup' ? pushupTotalAttempts : totalAttempts} attempts
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Incomplete Reps</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-numbers mt-1.5">
                  {activeExercise === 'pushup' ? pushupRejectedReps : rejectedReps}
                </div>
                <div className="text-[10px] text-rose-400/90 mt-1">
                  {activeExercise === 'pushup' ? 'Shallow / hip sag' : 'Shallow / timed out'}
                </div>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Session Time</span>
                  <Timer className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono-numbers mt-1.5">
                  {Math.floor(sessionSeconds / 60).toString().padStart(2, '0')}:{(sessionSeconds % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Stopped
                </div>
              </div>
            </div>

            {/* Biomechanical Insights & Warnings */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 sm:p-4 mb-4 text-xs">
              <div className="grid grid-cols-2 gap-3 mb-2.5">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingDown className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Avg Depth:{' '}
                    <strong className="text-white font-mono-numbers">
                      {activeExercise === 'pushup'
                        ? pushupRecentReps.filter((r) => r.isValid).length > 0
                          ? `${Math.round(
                              pushupRecentReps
                                .filter((r) => r.isValid)
                                .reduce((acc, r) => acc + r.minElbowAngle, 0) /
                                pushupRecentReps.filter((r) => r.isValid).length
                            )}°`
                          : '—'
                        : recentReps.filter((r) => r.isValid).length > 0
                        ? `${Math.round(
                            recentReps
                              .filter((r) => r.isValid)
                              .reduce((acc, r) => acc + r.minKneeAngle, 0) /
                              recentReps.filter((r) => r.isValid).length
                          )}°`
                        : '—'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Avg Tempo:{' '}
                    <strong className="text-white font-mono-numbers">
                      {activeExercise === 'pushup'
                        ? pushupRecentReps.filter((r) => r.isValid).length > 0
                          ? `${(
                              pushupRecentReps
                                .filter((r) => r.isValid)
                                .reduce((acc, r) => acc + r.durationMs, 0) /
                                pushupRecentReps.filter((r) => r.isValid).length /
                                1000
                            ).toFixed(1)}s`
                          : '—'
                        : recentReps.filter((r) => r.isValid).length > 0
                        ? `${(
                            recentReps
                              .filter((r) => r.isValid)
                              .reduce((acc, r) => acc + r.durationMs, 0) /
                              recentReps.filter((r) => r.isValid).length /
                              1000
                          ).toFixed(1)}s`
                        : '—'}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between flex-wrap gap-2">
                <span>Observed Form Warnings:</span>
                {(() => {
                  const issueList = Array.from(
                    new Set(
                      activeExercise === 'pushup'
                        ? pushupRecentReps.flatMap((r) => r.issues)
                        : recentReps.flatMap((r) => r.issues)
                    )
                  );
                  return (
                    <span
                      className={
                        issueList.length > 0
                          ? 'text-amber-400 font-medium'
                          : 'text-emerald-400 font-medium'
                      }
                    >
                      {issueList.length > 0
                        ? issueList.slice(0, 2).join(' · ')
                        : 'Zero warnings · Clean biomechanics'}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
              <button
                onClick={() => {
                  onStartNewSession();
                  startCamera();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors border border-slate-700 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start New Session</span>
              </button>

              <button
                onClick={startCamera}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-sm shadow-sky-500/25 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Turn On Camera &amp; Resume</span>
              </button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {(isCameraActive || isDemoMode) && isPaused && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-700 text-amber-400 mb-2">
              <Pause className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-white">Workout Paused</span>
            <button
              onClick={onTogglePause}
              className="mt-3 px-4 py-1.5 bg-sky-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-sky-400 transition-colors"
            >
              Resume Tracking
            </button>
          </div>
        )}

        {/* Floating Top HUD: Live Feedback Prompt */}
        {(isCameraActive || isDemoMode) && (
          <div className="absolute top-2.5 sm:top-4 inset-x-2.5 sm:inset-x-4 flex justify-center z-20 pointer-events-none">
            <div
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border shadow-lg backdrop-blur-md transition-all duration-200 flex items-center gap-2 max-w-[95%] sm:max-w-md text-center ${
                feedbackColorMap[activeExercise === 'pushup' ? pushupFeedback.type : feedback.type]
              }`}
            >
              {(activeExercise === 'pushup' ? pushupFeedback.type : feedback.type) === 'success' && (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              {(activeExercise === 'pushup' ? pushupFeedback.type : feedback.type) === 'warning' && (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              {(activeExercise === 'pushup' ? pushupFeedback.type : feedback.type) === 'alert' && (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="leading-tight">{activeExercise === 'pushup' ? pushupFeedback.text : feedback.text}</span>
            </div>
          </div>
        )}

        {/* Floating Bottom HUD: Phase & Angle Readout */}
        {(isCameraActive || isDemoMode) && (
          <div className="absolute bottom-2.5 sm:bottom-4 inset-x-2.5 sm:inset-x-4 flex items-end justify-between gap-2 z-20 pointer-events-none">
            {/* Phase Badge */}
            <div
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-semibold tracking-wider font-mono shadow-md backdrop-blur-md shrink-0 ${
                activeExercise === 'pushup'
                  ? `${pushupPhaseColorMap[pushupPhase].bg} ${pushupPhaseColorMap[pushupPhase].border} ${pushupPhaseColorMap[pushupPhase].text}`
                  : `${phaseColorMap[phase].bg} ${phaseColorMap[phase].border} ${phaseColorMap[phase].text}`
              }`}
            >
              {activeExercise === 'pushup' ? pushupPhase : phase}
            </div>

            {/* Biomechanical Angle Quick HUD */}
            {activeExercise === 'pushup' ? (
              pushupBiomechanics &&
              !pushupBiomechanics.trackingLost &&
              pushupBiomechanics.currentElbowAngle !== null && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md">
                  <div className="text-right">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-tight">Elbow Flexion</div>
                    <div className="text-xs sm:text-sm font-bold text-white font-mono-numbers">
                      {Math.round(pushupBiomechanics.currentElbowAngle)}°
                    </div>
                  </div>
                  <div className="h-5 sm:h-6 w-px bg-slate-800" />
                  <div className="text-right">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-tight">Target</div>
                    <div className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono-numbers">
                      ≤{pushupConfig?.targetBottomElbowAngle || 90}°
                    </div>
                  </div>
                  {pushupBiomechanics.trunkDeviationAngle !== null && (
                    <>
                      <div className="h-5 sm:h-6 w-px bg-slate-800" />
                      <div className="text-right">
                        <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-tight">Plank Dev</div>
                        <div
                          className={`text-xs sm:text-sm font-semibold font-mono-numbers ${
                            pushupBiomechanics.trunkDeviationAngle <=
                            (pushupConfig?.maxTrunkDeviationAngle || 18)
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {Math.round(pushupBiomechanics.trunkDeviationAngle)}°
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              biomechanics &&
              !biomechanics.trackingLost &&
              biomechanics.currentKneeAngle !== null && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md">
                  <div className="text-right">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-tight">Knee Flexion</div>
                    <div className="text-xs sm:text-sm font-bold text-white font-mono-numbers">
                      {biomechanics.currentKneeAngle}°
                    </div>
                  </div>
                  <div className="h-5 sm:h-6 w-px bg-slate-800" />
                  <div className="text-right">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-tight">Target</div>
                    <div className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono-numbers">
                      ≤{config.targetDepthAngle}°
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Subtle Peripheral Completion Glow on valid rep */}
        {showRepFlash && (
          <div className="absolute inset-0 rounded-2xl border-4 border-emerald-400/90 pointer-events-none z-30 transition-opacity duration-300 animate-pulse shadow-[inset_0_0_40px_rgba(52,211,153,0.35)]" />
        )}

        {/* High-visibility Peripheral Rep Counter for Push-ups */}
        {activeExercise === 'pushup' && (isCameraActive || isDemoMode) && (
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-20 pointer-events-none flex items-center gap-2">
            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-xl flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reps</span>
              <span className="text-lg sm:text-xl font-extrabold text-white font-mono-numbers leading-none">
                {pushupValidReps}
              </span>
              {pushupRejectedReps > 0 && (
                <span className="text-[11px] font-semibold text-rose-400 font-mono-numbers pl-1.5 border-l border-slate-700">
                  +{pushupRejectedReps}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera & Viewport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        {/* Left: Camera toggles & Push-up overlay switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="min-h-[38px] px-3 flex items-center gap-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Turn Off Camera</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="min-h-[38px] px-3 flex items-center gap-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 transition-colors shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Start Camera</span>
            </button>
          )}

          {isCameraActive && (
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              title="Mirror Camera Horizontal"
              className={`min-h-[38px] px-3 flex items-center gap-1.5 rounded-lg border transition-colors ${
                isMirrored
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mirror Video</span>
            </button>
          )}

          {/* Overlay Mode Switcher for Push-ups so user can clearly see their real body */}
          {activeExercise === 'pushup' && (isCameraActive || isDemoMode) && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setPushupOverlayMode('minimal')}
                title="Subtle Clean Skeleton: Shows clean joints without obstructing your real push-up"
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  pushupOverlayMode === 'minimal'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Clean View</span>
              </button>
              <button
                type="button"
                onClick={() => setPushupOverlayMode('off')}
                title="Real Camera Only: Zero skeleton lines, 100% pure webcam video"
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  pushupOverlayMode === 'off'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Real Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setPushupOverlayMode('full')}
                title="Full HUD: Detailed skeleton, angle arcs, and depth guides"
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  pushupOverlayMode === 'full'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full HUD</span>
              </button>
            </div>
          )}

          {availableDevices.length > 1 && isCameraActive && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="min-h-[38px] max-w-[130px] sm:max-w-[200px] truncate px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-hidden focus:border-sky-500"
            >
              {availableDevices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Simulation & Testing Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isDemoMode ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Pattern:</span>
              {activeExercise === 'pushup' ? (
                <>
                  <button
                    onClick={() => handleEnablePushupDemoMode('perfect_pushup')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoPushupMotion === 'perfect_pushup'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Full Depth
                  </button>
                  <button
                    onClick={() => handleEnablePushupDemoMode('shallow_pushup')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoPushupMotion === 'shallow_pushup'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Shallow
                  </button>
                  <button
                    onClick={() => handleEnablePushupDemoMode('hip_sag_pushup')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoPushupMotion === 'hip_sag_pushup'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Hip Sag
                  </button>
                  <button
                    onClick={() => handleEnablePushupDemoMode('knee_drop_pushup')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoPushupMotion === 'knee_drop_pushup'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Knee Drop
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEnableDemoMode('perfect_squat')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoMotion === 'perfect_squat'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Proper Sitting
                  </button>
                  <button
                    onClick={() => handleEnableDemoMode('half_squat')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoMotion === 'half_squat'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Half Sitting
                  </button>
                  <button
                    onClick={() => handleEnableDemoMode('heel_lift_squat')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoMotion === 'heel_lift_squat'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Heel Lift (Toe)
                  </button>
                  <button
                    onClick={() => handleEnableDemoMode('excessive_lean')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      demoMotion === 'excessive_lean'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Forward Lean
                  </button>
                </>
              )}
              <button
                onClick={startCamera}
                className="ml-1 text-sky-400 hover:underline text-[11px]"
              >
                Switch to Webcam
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (activeExercise === 'pushup') {
                  handleEnablePushupDemoMode('perfect_pushup');
                } else {
                  handleEnableDemoMode('perfect_squat');
                }
              }}
              className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1 text-[11px]"
              title="Test state machine with procedural human movement"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Test Simulator</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={onTogglePause}
            className={`min-h-[38px] px-3 flex items-center gap-1.5 rounded-lg border transition-colors ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

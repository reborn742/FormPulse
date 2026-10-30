import { PushupPhase, LivePushupBiomechanics, FormCategoryCheck } from '../types/pushup';
import { Keypoint } from '../types/squat';

// Skeleton bone connection pairs for MoveNet 17 keypoints
const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Torso
  [5, 6], [5, 11], [6, 12], [11, 12],
  // Left arm
  [5, 7], [7, 9],
  // Right arm
  [6, 8], [8, 10],
  // Left leg
  [11, 13], [13, 15],
  // Right leg
  [12, 14], [14, 16],
];

export interface RenderPushupOverlayOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  keypoints: Keypoint[] | null;
  biomechanics: LivePushupBiomechanics | null;
  phase: PushupPhase;
  formChecks: {
    hands: FormCategoryCheck;
    elbows: FormCategoryCheck;
    depth: FormCategoryCheck;
    core: FormCategoryCheck;
    legs: FormCategoryCheck;
    neck: FormCategoryCheck;
  } | null;
  targetBottomAngle: number;
  isMirrored: boolean;
  minConfidence: number;
  videoWidth: number;
  videoHeight: number;
  overlayMode?: 'full' | 'minimal' | 'off';
}

export function renderPushupOverlay({
  canvas,
  ctx,
  keypoints,
  biomechanics,
  phase,
  formChecks,
  targetBottomAngle,
  isMirrored,
  minConfidence,
  videoWidth,
  videoHeight,
  overlayMode = 'minimal',
}: RenderPushupOverlayOptions) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // If overlay is turned off, user gets 100% clean view of their real body video
  if (overlayMode === 'off' || !keypoints || keypoints.length < 17) {
    return;
  }

  const isMinimal = overlayMode === 'minimal';
  const scaleX = canvas.width / videoWidth;
  const scaleY = canvas.height / videoHeight;

  // Helper to map keypoint coordinate to canvas pixels with optional mirror transform
  const getCanvasCoords = (kp: Keypoint) => {
    let x = kp.x * scaleX;
    if (isMirrored) {
      x = canvas.width - x;
    }
    const y = kp.y * scaleY;
    return { x, y, score: kp.score ?? 0 };
  };

  const coords = keypoints.map(getCanvasCoords);

  // 1. Draw base skeleton bones with refined opacity so user's real body is visible
  ctx.lineWidth = isMinimal ? 2 : 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [i1, i2] of POSE_CONNECTIONS) {
    const p1 = coords[i1];
    const p2 = coords[i2];

    if (p1 && p2 && p1.score >= minConfidence && p2.score >= minConfidence) {
      let strokeColor = isMinimal ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.5)';

      const isArm =
        (i1 === 5 && i2 === 7) ||
        (i1 === 7 && i2 === 9) ||
        (i1 === 6 && i2 === 8) ||
        (i1 === 8 && i2 === 10);
      const isTorso = (i1 === 5 && i2 === 11) || (i1 === 6 && i2 === 12);
      const isLeg =
        (i1 === 11 && i2 === 13) ||
        (i1 === 13 && i2 === 15) ||
        (i1 === 12 && i2 === 14) ||
        (i1 === 14 && i2 === 16);

      if (isArm) {
        strokeColor =
          phase === 'BOTTOM'
            ? isMinimal ? 'rgba(52, 211, 153, 0.75)' : 'rgba(52, 211, 153, 0.9)'
            : isMinimal ? 'rgba(56, 189, 248, 0.65)' : 'rgba(56, 189, 248, 0.85)';
      } else if (isTorso) {
        if (formChecks?.core?.status === 'needs_correction') {
          strokeColor = isMinimal ? 'rgba(244, 63, 94, 0.65)' : 'rgba(244, 63, 94, 0.85)';
        } else if (formChecks?.core?.status === 'good') {
          strokeColor = isMinimal ? 'rgba(52, 211, 153, 0.65)' : 'rgba(52, 211, 153, 0.85)';
        }
      } else if (isLeg) {
        if (formChecks?.legs?.status === 'needs_correction') {
          strokeColor = isMinimal ? 'rgba(244, 63, 94, 0.6)' : 'rgba(244, 63, 94, 0.75)';
        }
      }

      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  // 2. Draw Highlight Plank Alignment Vector only in Full Mode
  if (!isMinimal) {
    const leftShoulder = coords[5];
    const leftHip = coords[11];
    const leftAnkle = coords[15];

    const rightShoulder = coords[6];
    const rightHip = coords[12];
    const rightAnkle = coords[16];

    const isLeftVisible =
      leftShoulder && leftHip && leftAnkle
        ? (leftShoulder.score + leftHip.score + leftAnkle.score) / 3 >= minConfidence
        : false;
    const isRightVisible =
      rightShoulder && rightHip && rightAnkle
        ? (rightShoulder.score + rightHip.score + rightAnkle.score) / 3 >= minConfidence
        : false;

    const side = isLeftVisible ? 'left' : isRightVisible ? 'right' : null;

    if (side) {
      const sIdx = side === 'left' ? 5 : 6;
      const hIdx = side === 'left' ? 11 : 12;
      const aIdx = side === 'left' ? 15 : 16;
      const kIdx = side === 'left' ? 13 : 14;

      const shoulder = coords[sIdx];
      const hip = coords[hIdx];
      const ankle = coords[aIdx];
      const knee = coords[kIdx];

      if (shoulder && hip && shoulder.score >= minConfidence && hip.score >= minConfidence) {
        const endpoint =
          ankle && ankle.score >= minConfidence
            ? ankle
            : knee && knee.score >= minConfidence
            ? knee
            : null;

        if (endpoint) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.moveTo(shoulder.x, shoulder.y);
          ctx.lineTo(endpoint.x, endpoint.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // 3. Draw Joint Circles (Non-intrusive)
  for (let i = 0; i < coords.length; i++) {
    const kp = coords[i];
    if (!kp || kp.score < minConfidence) continue;

    // In minimal mode, only highlight the elbow and wrist on the active arm
    const isElbow = [7, 8].includes(i);
    const isWrist = [9, 10].includes(i);
    const isShoulder = [5, 6].includes(i);
    const isHip = [11, 12].includes(i);

    if (isMinimal && !isElbow && !isWrist && !isShoulder) {
      continue;
    }

    const radius = isMinimal ? (isElbow ? 4 : 2.5) : (isElbow || isShoulder ? 4.5 : 3);

    ctx.beginPath();
    ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);

    if (isElbow) {
      ctx.fillStyle = phase === 'BOTTOM' ? '#10b981' : '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
    } else if (isWrist) {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
    } else if (isHip) {
      const hipFail = formChecks?.core?.status === 'needs_correction';
      ctx.fillStyle = hipFail ? '#f43f5e' : '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.8;
    }

    ctx.fill();
    ctx.stroke();
  }

  // 4. Draw Live Elbow Angle Arc and Label on Primary Visible Arm
  if (biomechanics && biomechanics.currentElbowAngle !== null && !biomechanics.trackingLost) {
    const activeArmSide = biomechanics.detectedSide || biomechanics.primarySide || 'left';
    const sKp = coords[activeArmSide === 'left' ? 5 : 6];
    const eKp = coords[activeArmSide === 'left' ? 7 : 8];
    const wKp = coords[activeArmSide === 'left' ? 9 : 10];

    if (
      sKp &&
      eKp &&
      wKp &&
      eKp.score >= minConfidence &&
      sKp.score >= minConfidence &&
      wKp.score >= minConfidence
    ) {
      const angle1 = Math.atan2(sKp.y - eKp.y, sKp.x - eKp.x);
      const angle2 = Math.atan2(wKp.y - eKp.y, wKp.x - eKp.x);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle =
        biomechanics.currentElbowAngle <= targetBottomAngle
          ? 'rgba(52, 211, 153, 0.9)'
          : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = isMinimal ? 2 : 2.5;
      ctx.arc(eKp.x, eKp.y, isMinimal ? 18 : 22, angle1, angle2, false);
      ctx.stroke();
      ctx.restore();

      // Compact Badge
      const labelText = `${Math.round(biomechanics.currentElbowAngle)}°`;
      ctx.font = 'bold 11px ui-monospace, monospace';
      const textMetrics = ctx.measureText(labelText);
      const badgeW = textMetrics.width + 10;
      const badgeH = 18;
      const badgeX = eKp.x + 12;
      const badgeY = eKp.y - 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle =
        biomechanics.currentElbowAngle <= targetBottomAngle ? '#10b981' : '#0284c7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - badgeH + 3, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, badgeX + 5, badgeY);
    }
  }

  // 5. Draw Target Depth Guideline only in Full mode
  if (
    !isMinimal &&
    (phase === 'DESCENDING' || phase === 'BOTTOM') &&
    biomechanics &&
    biomechanics.currentElbowAngle !== null
  ) {
    const activeArmSide = biomechanics.detectedSide || biomechanics.primarySide || 'left';
    const eKp = coords[activeArmSide === 'left' ? 7 : 8];

    if (eKp && eKp.score >= minConfidence) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle =
        biomechanics.currentElbowAngle <= targetBottomAngle
          ? 'rgba(52, 211, 153, 0.5)'
          : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(eKp.x - 30, eKp.y);
      ctx.lineTo(eKp.x + 30, eKp.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

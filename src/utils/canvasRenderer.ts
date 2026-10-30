import { FormIssue, Keypoint, LiveBiomechanics, SquatPhase } from '../types/squat';
import { MOVENET_KEYPOINTS, SKELETON_CONNECTIONS } from './geometry';

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  keypoints: Keypoint[] | null;
  biomechanics: LiveBiomechanics | null;
  phase: SquatPhase;
  activeIssues: FormIssue[];
  targetDepthAngle: number;
  isMirrored: boolean;
  minConfidence: number;
  videoWidth: number;
  videoHeight: number;
}

export function renderPoseOverlay({
  canvas,
  ctx,
  keypoints,
  biomechanics,
  phase,
  activeIssues,
  targetDepthAngle,
  isMirrored,
  minConfidence,
  videoWidth,
  videoHeight,
}: RenderOptions) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!keypoints || keypoints.length < 17 || !biomechanics || biomechanics.trackingLost) {
    return;
  }

  // Handle scaling between native video resolution and canvas display size
  const scaleX = canvas.width / videoWidth;
  const scaleY = canvas.height / videoHeight;

  ctx.save();

  // If video is mirrored (standard for front webcam selfie view)
  if (isMirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  // Determine skeleton bone color based on phase and issues
  const hasWarning = activeIssues.some((issue) => issue.severity === 'warning' || issue.severity === 'error');
  let boneColor = '#38bdf8'; // Sky cyan default
  let jointColor = '#0284c7';

  if (hasWarning) {
    boneColor = '#f59e0b'; // Amber warning
    jointColor = '#d97706';
  } else if (phase === 'BOTTOM') {
    boneColor = '#10b981'; // Emerald success depth reached
    jointColor = '#059669';
  } else if (phase === 'DESCENDING' || phase === 'ASCENDING') {
    boneColor = '#38bdf8';
    jointColor = '#0ea5e9';
  }

  // 1. Draw Skeleton Lines
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [fromIdx, toIdx] of SKELETON_CONNECTIONS) {
    const p1 = keypoints[fromIdx];
    const p2 = keypoints[toIdx];

    if (
      p1 &&
      p2 &&
      (p1.score ?? 0) >= minConfidence &&
      (p2.score ?? 0) >= minConfidence
    ) {
      const x1 = p1.x * scaleX;
      const y1 = p1.y * scaleY;
      const x2 = p2.x * scaleX;
      const y2 = p2.y * scaleY;

      ctx.strokeStyle = boneColor;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // 2. Draw Keypoint Joints
  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i];
    if (!kp || (kp.score ?? 0) < minConfidence) continue;

    const x = kp.x * scaleX;
    const y = kp.y * scaleY;

    const isPrimaryJoint =
      i === MOVENET_KEYPOINTS.LEFT_KNEE ||
      i === MOVENET_KEYPOINTS.RIGHT_KNEE ||
      i === MOVENET_KEYPOINTS.LEFT_HIP ||
      i === MOVENET_KEYPOINTS.RIGHT_HIP ||
      i === MOVENET_KEYPOINTS.LEFT_ANKLE ||
      i === MOVENET_KEYPOINTS.RIGHT_ANKLE;

    const radius = isPrimaryJoint ? 6 : 4;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isPrimaryJoint ? jointColor : boneColor;
    ctx.fill();
  }

  // 3. Draw Knee Angle Arc & Degree Label on Active Leg
  const activeSide = biomechanics.detectedSide;
  const kneeIdx = activeSide === 'left' ? MOVENET_KEYPOINTS.LEFT_KNEE : MOVENET_KEYPOINTS.RIGHT_KNEE;
  const hipIdx = activeSide === 'left' ? MOVENET_KEYPOINTS.LEFT_HIP : MOVENET_KEYPOINTS.RIGHT_HIP;
  const ankleIdx = activeSide === 'left' ? MOVENET_KEYPOINTS.LEFT_ANKLE : MOVENET_KEYPOINTS.RIGHT_ANKLE;

  const knee = keypoints[kneeIdx];
  const hip = keypoints[hipIdx];
  const ankle = keypoints[ankleIdx];

  if (
    knee &&
    hip &&
    ankle &&
    (knee.score ?? 0) >= minConfidence &&
    biomechanics.currentKneeAngle !== null
  ) {
    const kx = knee.x * scaleX;
    const ky = knee.y * scaleY;
    const angle = biomechanics.currentKneeAngle;

    // Highlight active knee with outer pulsing ring
    ctx.beginPath();
    ctx.arc(kx, ky, 12, 0, 2 * Math.PI);
    ctx.strokeStyle = angle <= targetDepthAngle ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Restore unmirrored coordinate system to render readable un-reversed text
    ctx.restore();
    ctx.save();

    // Map coordinates to non-mirrored canvas space for text rendering
    const textX = isMirrored ? canvas.width - kx + 18 : kx + 18;
    const textY = ky - 6;

    // Angle text pill background
    ctx.font = '600 13px "JetBrains Mono", monospace';
    const angleText = `${angle}°`;
    const textMetrics = ctx.measureText(angleText);
    const paddingX = 7;
    const pillWidth = textMetrics.width + paddingX * 2;
    const pillHeight = 22;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(textX - paddingX, textY - 15, pillWidth, pillHeight, 5);
    ctx.fill();

    ctx.strokeStyle = angle <= targetDepthAngle ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = angle <= targetDepthAngle ? '#34d399' : '#f8fafc';
    ctx.fillText(angleText, textX, textY);

    // 4. Render Sitting Status Tag (Proper Sitting vs Half Sitting)
    if (phase === 'DESCENDING' || phase === 'BOTTOM') {
      const sittingTag =
        biomechanics.sittingStatus === 'deep_sitting'
          ? 'Deep Sitting'
          : biomechanics.sittingStatus === 'parallel_sitting'
          ? 'Proper Sitting (Parallel)'
          : 'Half Sitting';
      const tagColor =
        biomechanics.sittingStatus === 'half_sitting' ? '#f59e0b' : '#10b981';

      ctx.font = '600 11px system-ui, sans-serif';
      const tagMetrics = ctx.measureText(sittingTag);
      const tagWidth = tagMetrics.width + 12;
      const tagX = textX - paddingX;
      const tagY = textY + 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagWidth, 18, 4);
      ctx.fill();

      ctx.strokeStyle = tagColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = tagColor;
      ctx.fillText(sittingTag, tagX + 6, tagY + 13);
    }

    // 5. Render Foot Flat / Heel Elevation Visual Indicator
    if (ankle && (ankle.score ?? 0) >= minConfidence) {
      const ax = ankle.x * scaleX;
      const ay = ankle.y * scaleY;
      const footTextX = isMirrored ? canvas.width - ax : ax;
      const isHeelLifted = biomechanics.isFootFlat === false;

      // Draw ground line under foot
      ctx.beginPath();
      ctx.moveTo(footTextX - 25, ay + 6);
      ctx.lineTo(footTextX + 25, ay + 6);
      ctx.strokeStyle = isHeelLifted ? '#ef4444' : '#10b981';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (isHeelLifted && (phase === 'DESCENDING' || phase === 'BOTTOM')) {
        const footMsg = 'Heel Lifted · Plant Foot';
        ctx.font = '600 10px system-ui, sans-serif';
        const footMetrics = ctx.measureText(footMsg);
        const fw = footMetrics.width + 10;
        const fx = footTextX - fw / 2;
        const fy = ay + 12;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.roundRect(fx, fy, fw, 17, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(footMsg, fx + 5, fy + 12);
      }
    }
  }

  ctx.restore();
}

// Shim for @mediapipe/pose CommonJS named export compatibility in Vite
export class Pose {
  setOptions() {}
  onResults() {}
  send() {}
  initialize() {}
  close() {}
  reset() {}
}

export const POSE_CONNECTIONS = [];
export const POSE_LANDMARKS = {};
export default { Pose, POSE_CONNECTIONS, POSE_LANDMARKS };

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { Keypoint, Pose } from '../types/squat';

export class PoseDetectorService {
  private detector: poseDetection.PoseDetector | null = null;
  private isInitializing = false;
  private isEstimating = false;
  private isDisposed = false;

  public async initialize(): Promise<boolean> {
    if (this.detector) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      // Ensure tfjs backend is loaded and ready
      await tf.ready();
      
      // Use WebGL if available, fallback to cpu if needed
      try {
        await tf.setBackend('webgl');
      } catch (err) {
        console.warn('WebGL backend failed, using default tf backend', err);
      }

      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.2,
        }
      );

      this.isInitializing = false;
      return true;
    } catch (err) {
      this.isInitializing = false;
      console.error('Failed to initialize MoveNet pose detector:', err);
      throw err;
    }
  }

  public isReady(): boolean {
    return this.detector !== null && !this.isDisposed;
  }

  public async estimatePose(
    source: HTMLVideoElement | HTMLCanvasElement
  ): Promise<Pose | null> {
    if (!this.detector || this.isEstimating || this.isDisposed) {
      return null;
    }

    // Verify video has valid non-zero dimensions
    if (source instanceof HTMLVideoElement) {
      if (source.readyState < 2 || source.videoWidth === 0 || source.videoHeight === 0) {
        return null;
      }
    }

    this.isEstimating = true;
    try {
      const poses = await this.detector.estimatePoses(source, {
        maxPoses: 1,
        flipHorizontal: false,
      });

      if (!poses || poses.length === 0) {
        return null;
      }

      const primaryPose = poses[0];
      const keypoints: Keypoint[] = (primaryPose.keypoints || []).map((kp) => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name,
      }));

      return {
        keypoints,
        score: primaryPose.score,
      };
    } catch (err) {
      console.warn('Pose estimation frame error:', err);
      return null;
    } finally {
      this.isEstimating = false;
    }
  }

  public dispose() {
    this.isDisposed = true;
    if (this.detector) {
      try {
        this.detector.dispose();
      } catch (e) {
        console.warn('Error disposing detector:', e);
      }
      this.detector = null;
    }
  }
}

export const poseDetectorService = new PoseDetectorService();

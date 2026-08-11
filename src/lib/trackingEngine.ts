import {
  snapPointToPolyline,
  getDistanceMeters,
  getPointAlongPolyline,
  getPolylineLengthMeters,
  lerpCoordinate,
  calculateBearing
} from './geoUtils';

export interface PingData {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface EngineState {
  currentPosition: [number, number];
  bearing: number;
  distanceAlongPolyline: number;
  currentSpeedKmh: number;
  isRecalibrating: boolean;
}

/**
 * Predictive Dead-Reckoning Live Tracking Engine.
 * Handles 3-second GPS update intervals smoothly using Exponential Moving Average (EMA)
 * speed estimation, polyline map matching, and 60 FPS soft-nudge recalibration.
 */
export class PredictiveTrackingEngine {
  private polyline: [number, number][];
  private totalLengthMeters: number;
  private pingIntervalSeconds: number;

  private lastPing: PingData | null = null;
  private currentPing: PingData | null = null;

  // Speed estimation (meters per second)
  private smoothedSpeedMps: number = 5.0; // Default 18 km/h fallback for village motorcycle
  private emaAlpha: number = 0.4; // Weight for new ping speed sample

  // Current extrapolated state along polyline
  private currentDistanceMeters: number = 0;
  private currentPosition: [number, number] = [0, 0];
  private currentBearing: number = 0;

  // Soft Recalibration (Nudge Lerp) variables
  private isRecalibrating: boolean = false;
  private recalibrationStartPos: [number, number] = [0, 0];
  private recalibrationTargetPos: [number, number] = [0, 0];
  private recalibrationProgress: number = 1.0; // 0.0 to 1.0
  private recalibrationDurationSeconds: number = 1.0; // Nudge over 1.0 second for 3s pings

  constructor(polyline: [number, number][], pingIntervalSeconds = 3) {
    this.polyline = polyline || [];
    this.totalLengthMeters = getPolylineLengthMeters(this.polyline);
    this.pingIntervalSeconds = pingIntervalSeconds;

    if (this.polyline.length > 0) {
      this.currentPosition = this.polyline[0];
      if (this.polyline.length > 1) {
        this.currentBearing = calculateBearing(
          this.polyline[0][0],
          this.polyline[0][1],
          this.polyline[1][0],
          this.polyline[1][1]
        );
      }
    }
  }

  /**
   * Updates the road polyline (e.g. when route is recalculated by OSRM).
   */
  public updatePolyline(newPolyline: [number, number][]) {
    this.polyline = newPolyline;
    this.totalLengthMeters = getPolylineLengthMeters(newPolyline);
  }

  /**
   * Process a new GPS Ping received every 20 seconds.
   */
  public onGpsPing(lat: number, lng: number, timestamp = Date.now()): EngineState {
    const newPing: PingData = { lat, lng, timestamp };

    // Snap the raw incoming GPS ping to our turn-by-turn road polyline
    const snapResult = snapPointToPolyline([lat, lng], this.polyline);
    const targetSnappedPos = snapResult.snapped;

    // Calculate distance of snapped point along the polyline
    let targetDistanceAlongPolyline = 0;
    for (let i = 0; i < snapResult.index; i++) {
      targetDistanceAlongPolyline += getDistanceMeters(
        this.polyline[i][0],
        this.polyline[i][1],
        this.polyline[i + 1][0],
        this.polyline[i + 1][1]
      );
    }
    targetDistanceAlongPolyline += getDistanceMeters(
      this.polyline[snapResult.index][0],
      this.polyline[snapResult.index][1],
      targetSnappedPos[0],
      targetSnappedPos[1]
    );

    if (this.currentPing) {
      this.lastPing = this.currentPing;
      const deltaTimeSec = Math.max(1, (timestamp - this.lastPing.timestamp) / 1000);
      const deltaDistMeters = Math.max(0, targetDistanceAlongPolyline - this.currentDistanceMeters);

      // Instantaneous speed calculation (m/s)
      const instantSpeedMps = deltaDistMeters / deltaTimeSec;

      // Exponential Moving Average (EMA) filtering for smooth velocity curve
      this.smoothedSpeedMps = (this.emaAlpha * instantSpeedMps) + ((1 - this.emaAlpha) * this.smoothedSpeedMps);
      // Clamp speed between 2 km/h (0.55 m/s) and 60 km/h (16.6 m/s)
      this.smoothedSpeedMps = Math.max(0.55, Math.min(16.6, this.smoothedSpeedMps));
    }

    this.currentPing = newPing;

    // Soft Nudge / Recalibration Trigger
    const predictedPos = this.currentPosition;
    const errorDistanceMeters = getDistanceMeters(
      predictedPos[0],
      predictedPos[1],
      targetSnappedPos[0],
      targetSnappedPos[1]
    );

    if (errorDistanceMeters > 3) { // Trigger nudge if deviation > 3m
      this.isRecalibrating = true;
      this.recalibrationStartPos = predictedPos;
      this.recalibrationTargetPos = targetSnappedPos;
      this.recalibrationProgress = 0.0;
    } else {
      this.currentDistanceMeters = targetDistanceAlongPolyline;
    }

    return this.getState();
  }

  /**
   * Called on every 60 FPS animation frame (via requestAnimationFrame).
   * @param deltaSeconds time elapsed since last frame in seconds (e.g. 0.016s)
   */
  public updateFrame(deltaSeconds: number): EngineState {
    // 1. Advance distance along polyline based on predictive speed
    if (this.currentDistanceMeters < this.totalLengthMeters) {
      this.currentDistanceMeters += this.smoothedSpeedMps * deltaSeconds;
      this.currentDistanceMeters = Math.min(this.totalLengthMeters, this.currentDistanceMeters);
    }

    // 2. Get standard extrapolated position on road polyline
    const pathState = getPointAlongPolyline(this.polyline, this.currentDistanceMeters);

    // 3. Handle Soft Recalibration (Nudge Lerp to actual GPS point if calibrating)
    if (this.isRecalibrating && this.recalibrationProgress < 1.0) {
      this.recalibrationProgress += deltaSeconds / this.recalibrationDurationSeconds;
      if (this.recalibrationProgress >= 1.0) {
        this.recalibrationProgress = 1.0;
        this.isRecalibrating = false;
      }

      this.currentPosition = lerpCoordinate(
        this.recalibrationStartPos,
        this.recalibrationTargetPos,
        this.recalibrationProgress
      );
    } else {
      this.currentPosition = pathState.point;
    }

    this.currentBearing = pathState.bearing;
    return this.getState();
  }

  /**
   * Returns current state of the predictive engine.
   */
  public getState(): EngineState {
    return {
      currentPosition: this.currentPosition,
      bearing: this.currentBearing,
      distanceAlongPolyline: this.currentDistanceMeters,
      currentSpeedKmh: Math.round(this.smoothedSpeedMps * 3.6),
      isRecalibrating: this.isRecalibrating
    };
  }
}

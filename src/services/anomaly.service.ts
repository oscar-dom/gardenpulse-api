import type { Sensor } from "../models/sensor.model.js";

type ThresholdRule = Pick<Sensor, "threshold" | "thresholdDirection">;

/**
 * A reading is anomalous only when it goes past the sensor's threshold in the
 * configured direction. A value equal to the threshold is still normal.
 */
export const isAnomalous = (value: number, { threshold, thresholdDirection }: ThresholdRule) =>
  thresholdDirection === "above" ? value > threshold : value < threshold;

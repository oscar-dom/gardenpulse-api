import type { Types } from "mongoose";
import { ReadingModel } from "../models/reading.model.js";
import type { Sensor } from "../models/sensor.model.js";

type ThresholdRule = Pick<Sensor, "threshold" | "thresholdDirection">;

/**
 * A reading is anomalous only when it goes past the sensor's threshold in the
 * configured direction. A value equal to the threshold is still normal.
 */
export const isAnomalous = (value: number, { threshold, thresholdDirection }: ThresholdRule) =>
  thresholdDirection === "above" ? value > threshold : value < threshold;

/**
 * Re-applies the rule to every stored reading of a sensor after its threshold or
 * direction changes, so the anomaly flag matches the current criterion. It runs
 * inside MongoDB in a single update; the comparison mirrors isAnomalous (strict
 * inequality, equal is normal) and a test checks both agree.
 */
export const recalculateAnomalies = async (
  sensorId: Types.ObjectId,
  { threshold, thresholdDirection }: ThresholdRule,
): Promise<number> => {
  const operator = thresholdDirection === "above" ? "$gt" : "$lt";
  const result = await ReadingModel.updateMany(
    { sensor: sensorId },
    [{ $set: { anomalous: { [operator]: ["$value", threshold] } } }],
    { updatePipeline: true },
  );
  return result.modifiedCount;
};

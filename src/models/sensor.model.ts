import { model, Schema } from "mongoose";

export const SENSOR_TYPES = ["soil_moisture", "temperature", "light", "air_humidity"] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

// The unit follows from what the sensor measures, so the server sets it instead of
// trusting the client (no "temperature in lux").
export const SENSOR_UNITS: Record<SensorType, string> = {
  soil_moisture: "%",
  temperature: "°C",
  light: "lux",
  air_humidity: "%",
};

// "above": a reading is anomalous when it exceeds the threshold (e.g. too hot).
// "below": when it falls under it (e.g. soil too dry).
export const THRESHOLD_DIRECTIONS = ["above", "below"] as const;
export type ThresholdDirection = (typeof THRESHOLD_DIRECTIONS)[number];

// Declared explicitly: Mongoose cannot infer this schema's types (every field
// comes out as `unknown`), which would make the typing useless.
export interface Sensor {
  name: string;
  type: SensorType;
  unit: string;
  location: string;
  threshold: number;
  thresholdDirection: ThresholdDirection;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sensorSchema = new Schema<Sensor>(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
      maxlength: [100, "name must have at most 100 characters"],
    },
    type: {
      type: String,
      required: [true, "type is required"],
      enum: { values: SENSOR_TYPES, message: "type must be one of: " + SENSOR_TYPES.join(", ") },
    },
    unit: { type: String, required: true },
    location: {
      type: String,
      required: [true, "location is required"],
      trim: true,
      maxlength: [100, "location must have at most 100 characters"],
    },
    threshold: { type: Number, required: [true, "threshold is required"] },
    thresholdDirection: {
      type: String,
      enum: THRESHOLD_DIRECTIONS,
      default: "above",
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      // Expose `id` instead of Mongo's `_id` and hide the internal `__v`.
      transform: (_doc, ret) => {
        const { _id, __v: _version, ...rest } = ret;
        return { id: String(_id), ...rest };
      },
    },
  },
);

// Runs before validation, so `unit` is always derived from `type` on save.
sensorSchema.pre("validate", function () {
  if (this.type) this.unit = SENSOR_UNITS[this.type];
});

export const SensorModel = model<Sensor>("Sensor", sensorSchema);

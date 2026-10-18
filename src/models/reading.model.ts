import { model, Schema, type Types } from "mongoose";

// The unit is not stored: it belongs to the sensor and is read from it, so readings
// never duplicate sensor data. `anomalous` is set by the server, never by the client,
// and stored (not computed per request) so the history can filter on it cheaply; it
// is recalculated if the sensor's threshold changes.
export interface Reading {
  sensor: Types.ObjectId;
  value: number;
  timestamp: Date;
  anomalous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const readingSchema = new Schema<Reading>(
  {
    sensor: {
      type: Schema.Types.ObjectId,
      ref: "Sensor",
      required: [true, "sensor is required"],
    },
    value: { type: Number, required: [true, "value is required"] },
    // When the measurement was taken, which may differ from when it reached the API.
    timestamp: { type: Date, required: [true, "timestamp is required"] },
    anomalous: { type: Boolean, required: [true, "anomalous is required"] },
  },
  {
    timestamps: true,
    toJSON: {
      // Expose `id` instead of Mongo's `_id` and hide the internal `__v`. When the
      // sensor is populated, its unit is also shown next to the value for clarity
      // (read from the sensor, not stored in the reading).
      transform: (_doc, ret) => {
        const { _id, __v: _version, ...rest } = ret;
        const sensor: unknown = rest.sensor;
        const unit =
          sensor && typeof sensor === "object" && "unit" in sensor ? sensor.unit : undefined;
        return { id: String(_id), ...rest, ...(unit !== undefined && { unit }) };
      },
    },
  },
);

// Match the reading history queries: by sensor sorted by date, and by anomaly.
readingSchema.index({ sensor: 1, timestamp: -1 });
readingSchema.index({ anomalous: 1, timestamp: -1 });

export const ReadingModel = model<Reading>("Reading", readingSchema);

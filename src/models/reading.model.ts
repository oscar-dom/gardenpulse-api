import { model, Schema, type Types } from "mongoose";

// `unit` and `anomalous` are set by the server from the sensor, never by the client.
// `anomalous` is stored (not computed per request) so the history can filter on it
// cheaply; it is recalculated if the sensor's threshold changes.
export interface Reading {
  sensor: Types.ObjectId;
  value: number;
  unit: string;
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
    unit: { type: String, required: [true, "unit is required"] },
    // When the measurement was taken, which may differ from when it reached the API.
    timestamp: { type: Date, required: [true, "timestamp is required"] },
    anomalous: { type: Boolean, required: [true, "anomalous is required"] },
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

// Match the reading history queries: by sensor sorted by date, and by anomaly.
readingSchema.index({ sensor: 1, timestamp: -1 });
readingSchema.index({ anomalous: 1, timestamp: -1 });

export const ReadingModel = model<Reading>("Reading", readingSchema);

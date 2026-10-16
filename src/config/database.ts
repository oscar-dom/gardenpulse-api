import mongoose from "mongoose";

export const connectDB = async (uri: string): Promise<void> => {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

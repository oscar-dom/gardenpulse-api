import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { app } from "./app.js";

const start = async (): Promise<void> => {
  try {
    await connectDB(env.MONGODB_URI);
  } catch (error) {
    console.error("Could not connect to MongoDB:", error);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`GardenPulse API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDB().then(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

void start();

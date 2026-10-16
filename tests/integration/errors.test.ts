import express from "express";
import request from "supertest";
import { app } from "../../src/app.js";
import { AppError } from "../../src/errors/app.error.js";
import { globalErrorHandler } from "../../src/middlewares/error.middleware.js";

describe("Error handling", () => {
  it("responds 404 for an unknown route", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "fail",
      error: "NotFound",
      message: "Route not found: GET /api/does-not-exist",
    });
  });

  it("responds 400 when the body is not valid JSON", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("InvalidJSON");
  });

  describe("global error handler", () => {
    // A throwaway app with routes that fail on purpose.
    const failingApp = express();
    failingApp.get("/app-error", () => {
      throw new AppError("Sensor not found", 404);
    });
    failingApp.get("/crash", () => {
      throw new Error("database password is hunter2");
    });
    failingApp.use(globalErrorHandler);

    it("maps an AppError to its status code", async () => {
      const res = await request(failingApp).get("/app-error");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ status: "fail", error: "NotFound", message: "Sensor not found" });
    });

    it("responds 500 without leaking details for an unexpected error", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(failingApp).get("/crash");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        status: "error",
        error: "InternalServerError",
        message: "An unexpected error occurred.",
      });
      expect(JSON.stringify(res.body)).not.toContain("hunter2");
      spy.mockRestore();
    });
  });
});

import request from "supertest";
import { app } from "../../src/app.js";

describe("Security middlewares", () => {
  it("adds the helmet security headers and hides the framework", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows the configured origin and no other", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const other = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });

  it("answers CORS preflight requests", async () => {
    const res = await request(app)
      .options("/api/sensors")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "PATCH");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
  });

  it("reports the remaining quota and answers 429 once the limit is reached", async () => {
    const first = await request(app).get("/api/health");
    expect(first.headers["ratelimit-limit"]).toBe("100");

    // The limit is 100 requests per IP every 15 minutes: 100 more always exceed it.
    for (let i = 0; i < 100; i++) {
      await request(app).get("/api/health");
    }
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      status: "fail",
      error: "TooManyRequests",
      message: "Too many requests. Try again in 15 minutes.",
    });
  });
});

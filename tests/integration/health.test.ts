import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/health", () => {
  it("responds 200 with the success envelope", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(typeof res.body.data.uptime).toBe("number");
  });
});

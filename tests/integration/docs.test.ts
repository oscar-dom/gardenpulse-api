import SwaggerParser from "@apidevtools/swagger-parser";
import request from "supertest";
import { app } from "../../src/app.js";
import openapiSpec from "../../src/docs/openapi.json" with { type: "json" };

describe("API documentation", () => {
  it("serves the interactive Swagger UI at /api/docs", async () => {
    const res = await request(app).get("/api/docs/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("swagger-ui");
  });

  it("serves the raw OpenAPI spec", async () => {
    const res = await request(app).get("/api/docs/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
  });

  it("is a valid OpenAPI document", async () => {
    // The validator resolves $refs in place, so give it a copy.
    await expect(
      SwaggerParser.validate(structuredClone(openapiSpec) as never),
    ).resolves.toBeDefined();
  });

  it("documents every endpoint of the API", () => {
    const documented = Object.entries(openapiSpec.paths).flatMap(([path, operations]) =>
      Object.keys(operations)
        .filter((key) => key !== "parameters")
        .map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(documented.sort()).toEqual(
      [
        "GET /health",
        "POST /auth/register",
        "POST /auth/login",
        "GET /auth/me",
        "GET /users/admin-requests",
        "PATCH /users/{id}/admin-request",
        "GET /sensors",
        "POST /sensors",
        "GET /sensors/{id}",
        "PATCH /sensors/{id}",
        "DELETE /sensors/{id}",
        "POST /sensors/{id}/readings",
        "GET /readings",
        "GET /readings/{id}",
      ].sort(),
    );
  });
});

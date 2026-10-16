import express from "express";
import request from "supertest";
import { z } from "zod";
import { globalErrorHandler } from "../../src/middlewares/error.middleware.js";
import { validate } from "../../src/middlewares/validate.middleware.js";

// A throwaway app with a validated route, until the real resources exist.
const testApp = express();
testApp.use(express.json());
testApp.post(
  "/items/:id",
  validate({
    params: z.object({ id: z.string().regex(/^\d+$/, "id must be numeric") }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    body: z.object({
      name: z.string().trim().min(3, "name must have at least 3 characters"),
      quantity: z.number().int().positive(),
    }),
  }),
  (req, res) => {
    res.status(200).json({ params: req.params, query: req.query, body: req.body });
  },
);
testApp.use(globalErrorHandler);

describe("Request validation", () => {
  it("passes parsed values to the handler when the input is valid", async () => {
    const res = await request(testApp)
      .post("/items/42?page=3")
      .send({ name: "  Tomato  ", quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      params: { id: "42" },
      query: { page: 3 }, // coerced from the "3" string
      body: { name: "Tomato", quantity: 5 }, // trimmed
    });
  });

  it("applies schema defaults", async () => {
    const res = await request(testApp).post("/items/1").send({ name: "Basil", quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({ page: 1 });
  });

  it("responds 400 listing every invalid field across params, query and body", async () => {
    const res = await request(testApp).post("/items/abc?page=0").send({ name: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(res.body.error).toBe("ValidationError");
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        { location: "params", field: "id", message: "id must be numeric" },
        expect.objectContaining({ location: "query", field: "page" }),
        { location: "body", field: "name", message: "name must have at least 3 characters" },
        expect.objectContaining({ location: "body", field: "quantity" }),
      ]),
    );
    expect(res.body.details).toHaveLength(4);
  });

  it("responds 400 when the body is missing", async () => {
    const res = await request(testApp).post("/items/1");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
  });
});

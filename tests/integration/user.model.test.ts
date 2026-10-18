import { Error as MongooseError, mongo } from "mongoose";
import { type User, UserModel } from "../../src/models/user.model.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const validUser = {
  name: "  Ada Gardener  ",
  email: "  Ada@Example.COM ",
  password: "plain-secret-123",
} as const;

describe("User model", () => {
  it("saves a valid user as a regular user with a normalized email", async () => {
    const user = await UserModel.create(validUser);

    expect(user.name).toBe("Ada Gardener");
    expect(user.email).toBe("ada@example.com");
    expect(user.role).toBe("user");
    expect(user.adminRequest).toBeUndefined();
  });

  it("stores the password as a bcrypt hash and can verify it", async () => {
    const { id } = await UserModel.create(validUser);
    const user = await UserModel.findById(id).select("+password").orFail();

    expect(user.password).not.toBe(validUser.password);
    expect(user.password).toMatch(/^\$2[aby]\$10\$/);
    expect(await user.comparePassword(validUser.password)).toBe(true);
    expect(await user.comparePassword("wrong-password")).toBe(false);
  });

  it("does not hash the password again when other fields change", async () => {
    const { id } = await UserModel.create(validUser);
    const user = await UserModel.findById(id).select("+password").orFail();
    const hash = user.password;

    user.name = "Ada Lovelace";
    await user.save();

    expect(user.password).toBe(hash);
    expect(await user.comparePassword(validUser.password)).toBe(true);
  });

  it("leaves the password out of queries and JSON", async () => {
    const created = await UserModel.create(validUser);
    const found = await UserModel.findById(created.id).orFail();
    // Mongoose types toJSON() as the raw document; the transform reshapes it.
    const json = created.toJSON() as unknown as Record<string, unknown>;

    expect(found.password).toBeUndefined();
    expect(json.id).toBe(created._id.toString());
    expect(json).not.toHaveProperty("password");
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
  });

  it("rejects a duplicate email regardless of case", async () => {
    await UserModel.init(); // make sure the unique index exists before inserting
    await UserModel.create(validUser);

    const error = await UserModel.create({ ...validUser, email: "ADA@example.com" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(mongo.MongoServerError);
    expect((error as mongo.MongoServerError).code).toBe(11000);
  });

  it("rejects missing fields, an invalid email and unknown enum values", async () => {
    // Invalid on purpose: the type system would reject these values at compile time.
    const invalid = {
      email: "not-an-email",
      role: "superuser",
      adminRequest: "maybe",
    } as unknown as Partial<User>;

    const error = await UserModel.create(invalid).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MongooseError.ValidationError);
    const { errors } = error as MongooseError.ValidationError;
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["name", "email", "password", "role", "adminRequest"]),
    );
    expect(errors.email?.message).toBe("email must be a valid email address");
  });
});

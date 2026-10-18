import { UserModel } from "../../src/models/user.model.js";
import { ensureAdmin } from "../../src/services/admin.service.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const admin = { name: "Administrator", email: "admin@example.com", password: "admin-secret-123" };

describe("ensureAdmin (npm run seed:admin)", () => {
  it("creates an admin with a hashed password", async () => {
    const { created, user } = await ensureAdmin(admin);

    expect(created).toBe(true);
    expect(user.role).toBe("admin");
    const stored = await UserModel.findById(user.id).select("+password").orFail();
    expect(await stored.comparePassword(admin.password)).toBe(true);
  });

  it("does nothing when the email is already registered", async () => {
    await ensureAdmin(admin);

    const { created } = await ensureAdmin({ ...admin, password: "another-password" });

    expect(created).toBe(false);
    expect(await UserModel.countDocuments()).toBe(1);
    const stored = await UserModel.findOne({ email: admin.email }).select("+password").orFail();
    expect(await stored.comparePassword(admin.password)).toBe(true);
  });
});

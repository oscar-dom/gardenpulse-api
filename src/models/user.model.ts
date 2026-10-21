import bcrypt from "bcrypt";
import { type HydratedDocument, type Model, model, Schema } from "mongoose";

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Signing up never grants admin: a user may ask for it, and an admin approves or
// rejects the request. The field is absent when the user never asked.
export const ADMIN_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type AdminRequestStatus = (typeof ADMIN_REQUEST_STATUSES)[number];

// Same cost factor as the course book: 2^10 hashing rounds.
const BCRYPT_ROUNDS = 10;

export interface User {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  adminRequest?: AdminRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModelType = Model<User, object, UserMethods>;
export type UserDocument = HydratedDocument<User, UserMethods>;

const userSchema = new Schema<User, UserModelType, UserMethods>(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
      maxlength: [100, "name must have at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email must be a valid email address"],
    },
    // Stored as a bcrypt hash. Length rules (8-72) are checked on the plain password
    // by the request validation, since the model only ever sees the hash.
    // Excluded from queries unless explicitly requested with select("+password").
    password: { type: String, required: [true, "password is required"], select: false },
    role: { type: String, enum: USER_ROLES, default: "user" },
    adminRequest: { type: String, enum: ADMIN_REQUEST_STATUSES },
  },
  {
    timestamps: true,
    toJSON: {
      // Expose `id`, and never leak the password hash or the internal `__v`.
      transform: (_doc, ret) => {
        const { _id, __v: _version, password: _password, ...rest } = ret;
        return { id: String(_id), ...rest };
      },
    },
  },
);

// Hash only when the password is new or changed, so saving other fields does not
// hash the existing hash again.
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  }
});

userSchema.method("comparePassword", function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
});

export const UserModel = model<User, UserModelType>("User", userSchema);

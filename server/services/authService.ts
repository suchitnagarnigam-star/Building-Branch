import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface JWTPayload {
  userId: number;
  officerId: string | null;
  role: string;
  name: string;
  zone: string | null;
  block?: string | null;
  blocks?: string[] | null;
  designation?: string | null;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "your_jwt_secret_key_here") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL [Security]: JWT_SECRET environment variable must be set in production. Refusing to start with missing or default secret."
      );
    }
    console.warn(
      "⚠️  [Security Warning]: JWT_SECRET is not configured or using default template. Using dev fallback key."
    );
    return "mcl_bb_dev_insecure_fallback_secret_do_not_use_in_prod";
  }
  return secret;
};

export const hashPassword = async (plain: string): Promise<string> => {
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  return bcrypt.hash(plain, rounds);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

const getJwtExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || "365d";
};

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as jwt.SignOptions);
};


export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
};


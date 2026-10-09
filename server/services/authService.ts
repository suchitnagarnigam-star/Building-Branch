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
  return process.env.JWT_SECRET || "mcl_bb_super_secret_jwt_key_2026_production_grade";
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


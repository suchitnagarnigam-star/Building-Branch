import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../services/authService";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    res.status(401).json({ success: false, message: "Authentication token required" });
    return;
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    res.status(401).json({ success: false, message: "Invalid authorization header format" });
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
};

export const requireRole = (...roles: string[]) => {
  const allowed = roles.map((r) => r.toLowerCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const userRole = (req.user.role || "").toLowerCase();
    if (!allowed.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role permissions",
      });
      return;
    }

    next();
  };
};


import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";


type AuthenticatedUser = {
  id: string;
  username: string;
  fullName: string;
  createdAt: Date;

};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized - No token provided" });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret is not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("id" in decoded) ||
      typeof decoded.id !== "string"
    ) {
      return res.status(401).json({ error: "Unauthorized - Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    (req as AuthenticatedRequest).user = user;

    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log("Error in auth middleware", errorMessage);

    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default authMiddleware;

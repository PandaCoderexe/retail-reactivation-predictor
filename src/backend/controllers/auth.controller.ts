import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    username: string;
    fullName: string;
    createdAt: Date;
  };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, fullName, password } = req.body;

    if (!username || !fullName || !password) {
      return res.status(400).json({
        message: "username, fullname and password are required",
      });
    }

    const userAlreadyExists = await prisma.user.findUnique({
      where: { username },
    });

    if (userAlreadyExists) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "User created successfully!",
      user: createUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create user",
      error,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid username or password",
      });
    }

    const isPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isPassword) {
      return res.status(400).json({
        message: "Invalid username or password",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.status(200).json({
      message: "Logged in successfully!",
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to log in",
      error,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token");

    res.status(200).json({
      message: "Logged out successfully!",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("Error in logout controller", errorMessage);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({
        message: "User is unauthotized",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("Error in getMe controller", errorMessage);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

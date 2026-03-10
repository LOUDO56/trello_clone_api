import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { User } from '../types/user';
import { TOKEN_COOKIE_NAME } from '../lib/contants';

export type AuthenticatedRequest = Request & {
  authUser: User;
};

export const getAuthUser = (req: Request): User => {
  return (req as AuthenticatedRequest).authUser;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ message: 'JWT_SECRET is not configured' });
    return;
  }

  const token = req.cookies?.[TOKEN_COOKIE_NAME];
  if (typeof token !== 'string' || token.length === 0) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  let payload: JwtPayload;
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'string') {
      res.status(401).json({ message: 'Invalid session token' });
      return;
    }

    payload = decoded;
  } catch {
    res.status(401).json({ message: 'Invalid session token' });
    return;
  }

  const userId = payload.sub;
  const userEmail = payload.email;
  if (typeof userId !== 'string' || typeof userEmail !== 'string') {
    res.status(401).json({ message: 'Invalid session payload' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user || user.email !== userEmail) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    (req as AuthenticatedRequest).authUser = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

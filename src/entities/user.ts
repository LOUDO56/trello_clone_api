import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import { TOKEN_COOKIE_NAME, TOKEN_MAX_AGE_MS } from '../lib/contants';

const router: Router = Router();

const getJwtSecret = (): string | null => {
  return process.env.JWT_SECRET || null;
};

const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE_MS,
  });
};

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Server error
 */
router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username || !email || !password) {
    res.status(400).json({ message: 'username, email and password are required' });
    return;
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    res.status(500).json({ message: 'JWT_SECRET is not configured' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, {
      expiresIn: '7d',
    });

    setSessionCookie(res, token);
    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticate a user and set a session cookie
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    res.status(500).json({ message: 'JWT_SECRET is not configured' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, {
      expiresIn: '7d',
    });

    setSessionCookie(res, token);
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
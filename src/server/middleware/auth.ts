import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { isUserInitialized, initializeNewUser } from '../services/userSetup.js';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// Track recently initialized users to avoid repeated DB checks
const recentlyInitialized = new Set<string>();
const INIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user info to request
    req.userId = user.id;
    req.userEmail = user.email;

    // Auto-initialize new users (skip if recently checked)
    if (!recentlyInitialized.has(user.id)) {
      const initialized = await isUserInitialized(user.id);
      if (!initialized) {
        await initializeNewUser(user.id);
        console.log(`Auto-initialized new user: ${user.email}`);
      }
      // Cache to avoid repeated checks
      recentlyInitialized.add(user.id);
      setTimeout(() => recentlyInitialized.delete(user.id), INIT_CACHE_TTL);
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDB } from './config/db';
import { authenticateSession } from './middleware/auth';
import { csrfProtection } from './middleware/csrf';
import { errorHandler } from './middleware/error';
import apiRoutes from './routes';

export function createApp(): Express {
  const app = express();

  // Instant diagnostic health check that does not require database connection
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Ensure DB connection for serverless / on-demand environments
  app.use(async (_req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err: any) {
      console.error('Database connection failed:', err);
      res.status(500).json({
        success: false,
        error: 'Database connection failed. Please ensure MONGODB_URI is configured in environment variables.',
        message: err.message,
      });
    }
  });

  // CORS configuration for httpOnly cookies & CSRF tokens
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        if (
          origin === env.CLIENT_ORIGIN ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-xsrf-token', 'x-csrf-token'],
      exposedHeaders: ['set-cookie'],
    })
  );

  // Body parsing & Cookie parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // CSRF Double-Submit Protection for state-changing requests
  app.use(csrfProtection);

  // Global session authentication middleware
  app.use(authenticateSession);

  // Mount API endpoints (both /api and / to handle Vercel rewrites seamlessly)
  app.use('/api', apiRoutes);
  app.use('/', apiRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Resource route '${req.method} ${req.originalUrl}' not found on server.`,
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

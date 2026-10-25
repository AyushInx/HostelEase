import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { authenticateSession } from './middleware/auth';
import { errorHandler } from './middleware/error';
import apiRoutes from './routes';

export function createApp(): Express {
  const app = express();

  // CORS configuration for httpOnly cookies
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing & Cookie parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Global session authentication middleware
  app.use(authenticateSession);

  // Mount API endpoints
  app.use('/api', apiRoutes);

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

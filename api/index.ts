import { createApp } from '../server/app';
import { connectDB } from '../server/config/db';
import { env } from '../server/config/env';

let app: any = null;

export default async function handler(req: any, res: any) {
  // Direct diagnostic health endpoint that does not wait for DB
  const rawUrl = req.url || '';
  if (rawUrl === '/api/health' || rawUrl === '/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'HostelEase Serverless API',
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    if (!app) {
      app = createApp();
    }

    // Connect to database
    await connectDB();

    // Wrap Express in a Promise that waits until response completion
    return new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      app(req, res);
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Database connection or serverless execution failed.',
      message: err.message,
      hasMongoUri: !!process.env.MONGODB_URI,
    });
  }
}

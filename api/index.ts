import { createApp } from '../server/app';
import { connectDB } from '../server/config/db';
import { User } from '../server/models/User';
import { runSeed } from '../server/scripts/seed';

const app = createApp();

// Handler for Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  try {
    await connectDB();

    // Auto-seed if database is empty on first cold start
    const count = await User.countDocuments();
    if (count === 0) {
      await runSeed();
    }

    return app(req, res);
  } catch (err: any) {
    console.error('Serverless execution error:', err);
    return res.status(500).json({
      success: false,
      error: 'Database connection or serverless execution failed.',
      message: err.message,
    });
  }
}


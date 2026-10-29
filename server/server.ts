import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { escalationService } from './services/escalation.service';
import { User } from './models/User';
import { runSeed } from './scripts/seed';

async function startServer(): Promise<void> {
  try {
    await connectDB();

    // Auto-seed if database has no users (e.g. fresh memory server or clean DB)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Running initial bootstrap seed...');
      await runSeed();
    }

    const app = createApp();

    // Start background SLA escalation scheduler
    escalationService.startScheduler(60000);

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Hostel Complaint Tracker API running on http://localhost:${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔒 Cookie Security: ${env.NODE_ENV === 'production' ? 'Secure (HTTPS)' : 'Lax (HTTP/Local)'}`);
      console.log(`⏰ Escalation Scheduler: Active (60s tick)`);
    });

    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      escalationService.stopScheduler();
      server.close(async () => {
        await disconnectDB();
        console.log('✅ Server and database disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

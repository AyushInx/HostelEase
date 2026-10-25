import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

async function startServer(): Promise<void> {
  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Hostel Complaint Tracker API running on http://localhost:${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔒 Cookie Security: ${env.NODE_ENV === 'production' ? 'Secure (HTTPS)' : 'Lax (HTTP/Local)'}`);
    });

    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
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

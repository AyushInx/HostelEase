import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }

  const targetUri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    if (env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (err: any) {
    if (env.NODE_ENV === 'production' || !!process.env.VERCEL || env.NODE_ENV === 'test') {
      console.error(`❌ Fatal: Failed to connect to primary MongoDB in production/serverless: ${err.message}`);
      throw new Error(`Primary MongoDB connection failed: ${err.message}. Please verify MONGODB_URI is configured correctly.`);
    }
    console.warn(`⚠️ Could not connect to primary MongoDB at ${targetUri}: ${err.message}`);
    console.log('🔄 Attempting fallback: starting embedded Mongo for development...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      isConnected = true;
      console.log(`✅ Development in-memory MongoDB running at: ${memUri}`);
      return conn;
    } catch (fallbackErr: any) {
      console.error('❌ Failed to start fallback MongoDB:', fallbackErr.message);
      throw err;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

import { createApp } from '../server/app';

const app = createApp();

// Export the Express app as the default handler for Vercel Serverless
export default app;

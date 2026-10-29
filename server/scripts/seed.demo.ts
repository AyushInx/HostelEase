/**
 * Dedicated idempotent demo database seed runner for HostelEase.
 * Provisions demo student (Alex Sharma), staff accounts, hostels, and 5 realistic complaints with timeline milestones.
 */
import { connectDB, disconnectDB } from '../config/db';
import { runSeed } from './seed';

async function seedDemo(): Promise<void> {
  console.log('🎮 Running HostelEase Demo Data Seed...');
  await connectDB();
  await runSeed();
  console.log('✅ Demo seeding finished successfully.');
}

seedDemo()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Demo seeding failed:', err);
    await disconnectDB();
    process.exit(1);
  });


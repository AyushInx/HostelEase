import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function migrateDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to DB for migration');

  // 1. Delete legacy non-iitp users
  const legacyEmails = [
    'alex.sharma@college.edu',
    'priya.patel@college.edu',
    'caretaker.mandakini@hostel.edu',
    'warden.mandakini@hostel.edu',
    'caretaker.kalam@hostel.edu',
    'warden.kalam@hostel.edu',
    'tech.raj@hostel.edu',
    'tech.amit@hostel.edu',
    'admin@campus.edu',
  ];

  const delUsers = await mongoose.connection.db.collection('users').deleteMany({
    email: { $in: legacyEmails },
  });
  console.log('Deleted legacy users:', delUsers.deletedCount);

  // 2. Remove any complaints pointing to Mandakini Hostel
  const delComplaints = await mongoose.connection.db.collection('complaints').deleteMany({
    hostelName: /mandakini/i,
  });
  console.log('Deleted Mandakini complaints:', delComplaints.deletedCount);

  // 3. Clear complaints and status histories so runSeed() re-populates cleanly
  const clearedComplaints = await mongoose.connection.db.collection('complaints').deleteMany({});
  console.log('Cleared all complaints:', clearedComplaints.deletedCount);

  const clearedHistories = await mongoose.connection.db.collection('status_histories').deleteMany({});
  console.log('Cleared status_histories:', clearedHistories.deletedCount);

  await mongoose.disconnect();
  console.log('Database cleaned successfully.');
}

migrateDb().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});


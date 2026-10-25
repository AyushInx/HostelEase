import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { Hostel } from '../models/Hostel';
import { Complaint } from '../models/Complaint';
import { StatusHistory } from '../models/StatusHistory';
import { AuditLog } from '../models/AuditLog';

export async function runSeed(): Promise<void> {
  console.log('🌱 Starting Hostel Complaint Tracker database seed...');
  await connectDB();

  // 1. Bootstrap First Hostel Admin from Environment Variables (SPEC Invariant)
  console.log('👑 Bootstrapping primary Hostel Admin from environment variables...');
  let admin = await User.findOne({ email: env.INITIAL_ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    const adminPasswordHash = await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, 10);
    admin = new User({
      name: env.INITIAL_ADMIN_NAME,
      email: env.INITIAL_ADMIN_EMAIL.toLowerCase(),
      passwordHash: adminPasswordHash,
      role: 'Hostel Admin',
      eligibilityStatus: 'approved',
    });
    await admin.save();
    console.log(`   ✅ Admin created: ${admin.email}`);
  } else {
    console.log(`   ℹ️ Admin already exists: ${admin.email}`);
  }

  // 2. Seed Hostels & Residential Blocks
  console.log('🏢 Seeding Hostels and Blocks...');
  const hostelsData = [
    {
      name: 'Mandakini Hostel',
      code: 'MND',
      caretakerName: 'Suresh Kumar',
      wardenName: 'Dr. Anita Roy',
      blocks: [
        { name: 'A Block', floors: 4, roomsCount: 120 },
        { name: 'B Block', floors: 4, roomsCount: 120 },
      ],
    },
    {
      name: 'Kaveri Hostel',
      code: 'KVR',
      caretakerName: 'Ramesh Chandra',
      wardenName: 'Dr. K. Sharma',
      blocks: [
        { name: 'A Block', floors: 3, roomsCount: 90 },
        { name: 'B Block', floors: 3, roomsCount: 90 },
      ],
    },
    {
      name: 'Ganga Hostel',
      code: 'GNG',
      caretakerName: 'Mahesh Babu',
      wardenName: 'Prof. V. Raman',
      blocks: [
        { name: 'East Wing', floors: 5, roomsCount: 150 },
        { name: 'West Wing', floors: 5, roomsCount: 150 },
      ],
    },
  ];

  for (const hData of hostelsData) {
    const exists = await Hostel.findOne({ code: hData.code });
    if (!exists) {
      await Hostel.create(hData);
      console.log(`   ✅ Hostel created: ${hData.name} (${hData.code})`);
    }
  }

  // 3. Seed Staff and Demo Students
  console.log('👥 Seeding Staff and Students...');
  const defaultPass = await bcrypt.hash('mock-staff-pass', 10);
  const studentPass = await bcrypt.hash('mock-student-pass', 10);

  const usersData: Array<{
    name: string;
    email: string;
    passwordHash: string;
    role: any;
    eligibilityStatus: any;
    hostelName?: string;
    roomNumber?: string;
    specialization?: string;
  }> = [
    // Caretaker
    {
      name: 'Suresh Kumar',
      email: 'caretaker.mandakini@hostel.edu',
      passwordHash: defaultPass,
      role: 'Caretaker',
      eligibilityStatus: 'approved',
      hostelName: 'Mandakini Hostel',
    },
    // Technicians
    {
      name: 'Rajesh Verma',
      email: 'tech.raj@hostel.edu',
      passwordHash: defaultPass,
      role: 'Technician',
      eligibilityStatus: 'approved',
      specialization: 'Electrical & Power Systems',
    },
    {
      name: 'Amit Singh',
      email: 'tech.amit@hostel.edu',
      passwordHash: defaultPass,
      role: 'Technician',
      eligibilityStatus: 'approved',
      specialization: 'Plumbing & Drainage',
    },
    // Warden
    {
      name: 'Dr. Anita Roy',
      email: 'warden.mandakini@hostel.edu',
      passwordHash: defaultPass,
      role: 'Warden',
      eligibilityStatus: 'approved',
      hostelName: 'Mandakini Hostel',
    },
    // Students
    {
      name: 'Alex Sharma',
      email: 'alex.sharma@college.edu',
      passwordHash: studentPass,
      role: 'Student',
      eligibilityStatus: 'approved',
      hostelName: 'Mandakini Hostel',
      roomNumber: 'B-304',
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@college.edu',
      passwordHash: studentPass,
      role: 'Student',
      eligibilityStatus: 'pending',
      hostelName: 'Kaveri Hostel',
      roomNumber: 'A-102',
    },
  ];

  const seededUsers: Record<string, any> = {};

  for (const uData of usersData) {
    let u = await User.findOne({ email: uData.email });
    if (!u) {
      u = await User.create(uData);
      console.log(`   ✅ User created: ${u.name} (${u.role})`);
    }
    seededUsers[uData.email] = u;
  }

  // 4. Seed Initial Sample Complaints
  console.log('📋 Seeding Initial Complaints & Timeline Milestones...');
  const alex = seededUsers['alex.sharma@college.edu'];
  const rajesh = seededUsers['tech.raj@hostel.edu'];
  const suresh = seededUsers['caretaker.mandakini@hostel.edu'];
  const anita = seededUsers['warden.mandakini@hostel.edu'];

  if (alex && (await Complaint.countDocuments()) === 0) {
    const complaintsToSeed: Array<{
      referenceId: string;
      student: any;
      studentName: string;
      hostelName: string;
      block: string;
      roomNumber: string;
      category: any;
      title: string;
      description: string;
      priority: any;
      status: any;
      assignedTechnician?: any;
      assignedTechnicianName?: string;
      repairNotes?: string;
      supportCount: number;
      unresolvedReportsCount: number;
    }> = [
      {
        referenceId: 'HCT-2026-84912',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Mandakini Hostel',
        block: 'B Block',
        roomNumber: 'B-304',
        category: 'Electrical',
        title: 'Ceiling Fan Making Loud Noise',
        description: 'The regulator is sparking occasionally and the fan blade rattles loudly at speeds above 2.',
        priority: 'High',
        status: 'Assigned',
        assignedTechnician: rajesh._id,
        assignedTechnicianName: rajesh.name,
        supportCount: 4,
        unresolvedReportsCount: 0,
      },
      {
        referenceId: 'HCT-2026-92104',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Mandakini Hostel',
        block: 'B Block',
        roomNumber: 'B-304',
        category: 'Plumbing',
        title: 'Bathroom Tap Leaking Continuously',
        description: 'Water drips constantly from the washbasin faucet, causing floor pooling.',
        priority: 'Medium',
        status: 'In Progress',
        assignedTechnician: rajesh._id,
        assignedTechnicianName: rajesh.name,
        supportCount: 2,
        unresolvedReportsCount: 0,
      },
      {
        referenceId: 'HCT-2026-51204',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Mandakini Hostel',
        block: 'B Block',
        roomNumber: 'B-304',
        category: 'Network / Wi-Fi',
        title: 'Corridor Access Point AP-04 Offline',
        description: 'Wi-Fi disconnects repeatedly on the 3rd floor west corridor.',
        priority: 'Medium',
        status: 'Resolved',
        repairNotes: 'Replaced faulty PoE injector and verified SSID broadcast at 100Mbps.',
        supportCount: 8,
        unresolvedReportsCount: 0,
      },
    ];

    for (const cData of complaintsToSeed) {
      const c = (await Complaint.create(cData)) as any;
      console.log(`   ✅ Complaint seeded: ${c.referenceId} (${c.status})`);

      // Initial StatusHistory
      await StatusHistory.create({
        complaint: c._id,
        actor: alex._id,
        actorName: alex.name,
        actorRole: alex.role,
        fromStatus: 'Submitted',
        toStatus: 'Submitted',
        remarks: 'Complaint registered by student.',
        timestamp: new Date(Date.now() - 3 * 86400000),
      });

      if (c.status === 'Assigned' || c.status === 'In Progress' || c.status === 'Resolved') {
        await StatusHistory.create({
          complaint: c._id,
          actor: suresh._id,
          actorName: suresh.name,
          actorRole: suresh.role,
          fromStatus: 'Submitted',
          toStatus: 'Assigned',
          remarks: `Assigned to duty electrician ${rajesh.name}.`,
          timestamp: new Date(Date.now() - 2 * 86400000),
        });
      }

      if (c.status === 'In Progress' || c.status === 'Resolved') {
        await StatusHistory.create({
          complaint: c._id,
          actor: rajesh._id,
          actorName: rajesh.name,
          actorRole: rajesh.role,
          fromStatus: 'Assigned',
          toStatus: 'In Progress',
          remarks: 'Technician commenced diagnostic.',
          timestamp: new Date(Date.now() - 1 * 86400000),
        });
      }

      if (c.status === 'Resolved') {
        await StatusHistory.create({
          complaint: c._id,
          actor: anita._id,
          actorName: anita.name,
          actorRole: anita.role,
          fromStatus: 'Work Completed',
          toStatus: 'Resolved',
          remarks: 'Resolution verified and closed by Warden.',
          timestamp: new Date(),
        });
      }
    }
  }

  // 5. Initial Audit Log
  await AuditLog.create({
    actorName: 'System Bootstrap',
    actorRole: 'System',
    action: 'SEED_DATABASE',
    targetEntity: 'Hostel',
    entityId: 'All',
    details: 'Database seeded with hostels, blocks, staff, and initial complaints.',
    timestamp: new Date(),
  });

  console.log('✨ Seed complete!\n');
}

// Direct execution when run via `node` / `tsx` / `ts-node`
if (process.argv[1]?.includes('seed')) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seeding failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}

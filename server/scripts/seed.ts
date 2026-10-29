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
      isDemo: true,
    });
    await admin.save();
    console.log(`   ✅ Admin created: ${admin.email}`);
  } else {
    admin.isDemo = true;
    await admin.save();
    console.log(`   ℹ️ Admin already exists: ${admin.email}`);
  }

  // 2. Seed Hostels & Residential Blocks
  console.log('🏢 Seeding Hostels and Blocks...');
  const hostelsData = [
    {
      name: 'Kalam Hostel',
      code: 'KLM',
      caretakerName: 'Suresh Kumar',
      wardenName: 'Dr. Anita Roy',
      blocks: [
        { name: 'A Block', floors: 8, roomsCount: 296 },
        { name: 'B Block', floors: 8, roomsCount: 208 },
        { name: 'C Block', floors: 8, roomsCount: 208 },
        { name: 'D Block', floors: 8, roomsCount: 296 },
      ],
    },
    {
      name: 'Asima Hostel',
      code: 'ASM',
      caretakerName: 'Sunita Devi',
      wardenName: 'Prof. V. Raman',
      blocks: [
        { name: 'East Wing', floors: 5, roomsCount: 150 },
        { name: 'West Wing', floors: 5, roomsCount: 150 },
      ],
    },
    {
      name: 'Aryabhatta Hostel',
      code: 'ABH',
      caretakerName: 'Rakesh Verma',
      wardenName: 'Dr. S. Mukherjee',
      blocks: [
        { name: 'A Block', floors: 8, roomsCount: 256 },
        { name: 'B Block', floors: 8, roomsCount: 256 },
        { name: 'C Block', floors: 8, roomsCount: 256 },
        { name: 'D Block', floors: 8, roomsCount: 256 },
      ],
    },
    {
      name: 'C.V.R Hostel',
      code: 'CVR',
      caretakerName: 'Mahesh Babu',
      wardenName: 'Dr. K. Sharma',
      blocks: [
        { name: 'A Block', floors: 8, roomsCount: 224 },
      ],
    },
  ];

  for (const hData of hostelsData) {
    const exists = await Hostel.findOne({ code: hData.code });
    if (!exists) {
      await Hostel.create(hData);
      console.log(`   ✅ Hostel created: ${hData.name} (${hData.code})`);
    } else {
      exists.name = hData.name;
      exists.caretakerName = hData.caretakerName;
      exists.wardenName = hData.wardenName;
      exists.blocks = hData.blocks as any;
      await exists.save();
      console.log(`   ✅ Hostel updated: ${hData.name} (${hData.code})`);
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
    isEmailVerified: boolean;
    eligibilityStatus: any;
    hostelName?: string;
    roomNumber?: string;
    specialization?: string;
    isDemo?: boolean;
  }> = [
    // Kalam Hostel Staff (Boys)
    {
      name: 'Suresh Kumar',
      email: 'caretaker.kalam@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Caretaker',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Kalam Hostel',
      isDemo: true,
    },
    {
      name: 'Dr. Anita Roy',
      email: 'warden.kalam@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Warden',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Kalam Hostel',
      isDemo: true,
    },
    // Asima Hostel Staff (Girls)
    {
      name: 'Sunita Devi',
      email: 'caretaker.asima@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Caretaker',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Asima Hostel',
      isDemo: true,
    },
    {
      name: 'Prof. V. Raman',
      email: 'warden.asima@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Warden',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Asima Hostel',
      isDemo: true,
    },
    // Technicians
    {
      name: 'Rajesh Verma',
      email: 'tech.raj@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Technician',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      specialization: 'Electrical & Power Systems',
      isDemo: true,
    },
    {
      name: 'Amit Singh',
      email: 'tech.amit@iitp.ac.in',
      passwordHash: defaultPass,
      role: 'Technician',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      specialization: 'Plumbing & Drainage',
      isDemo: true,
    },
    // Students
    {
      name: 'Alex Sharma',
      email: 'alex.sharma@iitp.ac.in',
      passwordHash: studentPass,
      role: 'Student',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Kalam Hostel',
      roomNumber: 'B-304',
      isDemo: true,
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@iitp.ac.in',
      passwordHash: studentPass,
      role: 'Student',
      isEmailVerified: true,
      eligibilityStatus: 'pending',
      hostelName: 'Asima Hostel',
      roomNumber: 'G-102',
      isDemo: true,
    },
    {
      name: 'Ayush',
      email: 'ayush_2401ec60@iitp.ac.in',
      passwordHash: studentPass,
      role: 'Student',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: 'Kalam Hostel',
      roomNumber: 'A-201',
      isDemo: true,
    },
  ];

  const seededUsers: Record<string, any> = {};

  for (const uData of usersData) {
    let u = await User.findOne({ email: uData.email });
    if (!u) {
      u = await User.create(uData);
      console.log(`   ✅ User created: ${u.name} (${u.role})`);
    } else {
      u.name = uData.name;
      u.role = uData.role;
      u.passwordHash = uData.passwordHash;
      u.hostelName = uData.hostelName;
      u.roomNumber = uData.roomNumber;
      u.isEmailVerified = true;
      u.eligibilityStatus = uData.eligibilityStatus;
      u.isDemo = true;
      if (uData.specialization) u.specialization = uData.specialization;
      await u.save();
      console.log(`   ✅ User updated: ${u.name} (${u.role}, ${u.hostelName || 'General'})`);
    }
    seededUsers[uData.email] = u;
  }

  // 4. Seed Initial Sample Complaints
  console.log('📋 Seeding Initial Complaints & Timeline Milestones...');
  const alex = seededUsers['alex.sharma@iitp.ac.in'];
  const priya = seededUsers['priya.patel@iitp.ac.in'];
  const rajesh = seededUsers['tech.raj@iitp.ac.in'];
  const suresh = seededUsers['caretaker.kalam@iitp.ac.in'];
  const anita = seededUsers['warden.kalam@iitp.ac.in'];
  const sunita = seededUsers['caretaker.asima@iitp.ac.in'];

  if (alex) {
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
      isDemo: boolean;
    }> = [
      // Kalam Hostel (Alex Sharma)
      {
        referenceId: 'HCT-2026-84912',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Kalam Hostel',
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
        isDemo: true,
      },
      {
        referenceId: 'HCT-2026-92104',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Kalam Hostel',
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
        isDemo: true,
      },
      {
        referenceId: 'HCT-2026-51204',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Kalam Hostel',
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
        isDemo: true,
      },
      {
        referenceId: 'HCT-2026-34891',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Kalam Hostel',
        block: 'B Block',
        roomNumber: 'B-304',
        category: 'Carpentry',
        title: 'Study Table Drawer Broken Runner',
        description: 'The right-hand runner of the study table drawer detached. Fixed once but detached again.',
        priority: 'Low',
        status: 'Reopened',
        assignedTechnician: rajesh._id,
        assignedTechnicianName: rajesh.name,
        repairNotes: 'Replaced rail screws and lubricated drawer track.',
        supportCount: 1,
        unresolvedReportsCount: 0,
        isDemo: true,
      },
      {
        referenceId: 'HCT-2026-67319',
        student: alex._id,
        studentName: alex.name,
        hostelName: 'Kalam Hostel',
        block: 'B Block',
        roomNumber: 'B-304',
        category: 'Cleanliness',
        title: 'Common Washroom Exhaust Fan Jammed',
        description: 'The second floor common washroom exhaust fan is completely jammed with debris and not rotating.',
        priority: 'High',
        status: 'Submitted',
        supportCount: 5,
        unresolvedReportsCount: 0,
        isDemo: true,
      },
    ];

    if (priya) {
      complaintsToSeed.push(
        {
          referenceId: 'HCT-2026-78210',
          student: priya._id,
          studentName: priya.name,
          hostelName: 'Asima Hostel',
          block: 'East Wing',
          roomNumber: 'G-102',
          category: 'Electrical',
          title: 'Water Geyser Thermostat Failure',
          description: 'The geyser in the 1st floor washroom is overheating and tripping the MCB automatically.',
          priority: 'High',
          status: 'In Progress',
          assignedTechnician: rajesh._id,
          assignedTechnicianName: rajesh.name,
          supportCount: 3,
          unresolvedReportsCount: 0,
          isDemo: true,
        },
        {
          referenceId: 'HCT-2026-44129',
          student: priya._id,
          studentName: priya.name,
          hostelName: 'Asima Hostel',
          block: 'East Wing',
          roomNumber: 'G-102',
          category: 'Carpentry',
          title: 'Room Window Latch Jammed',
          description: 'The exterior window latch has seized and cannot be latched shut.',
          priority: 'Medium',
          status: 'Submitted',
          supportCount: 1,
          unresolvedReportsCount: 0,
          isDemo: true,
        }
      );
    }

    for (const cData of complaintsToSeed) {
      const existing = await Complaint.findOne({ referenceId: cData.referenceId });
      if (!existing) {
        const c: any = await Complaint.create(cData);
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

        if (c.status === 'Assigned' || c.status === 'In Progress' || c.status === 'Resolved' || c.status === 'Reopened') {
          await StatusHistory.create({
            complaint: c._id,
            actor: suresh._id,
            actorName: suresh.name,
            actorRole: suresh.role,
            fromStatus: 'Submitted',
            toStatus: 'Assigned',
            remarks: `Assigned to duty technician ${rajesh.name}.`,
            timestamp: new Date(Date.now() - 2 * 86400000),
          });
        }

        if (c.status === 'In Progress' || c.status === 'Resolved' || c.status === 'Reopened') {
          await StatusHistory.create({
            complaint: c._id,
            actor: rajesh._id,
            actorName: rajesh.name,
            actorRole: rajesh.role,
            fromStatus: 'Assigned',
            toStatus: 'In Progress',
            remarks: 'Technician commenced diagnostic and parts procurement.',
            timestamp: new Date(Date.now() - 1 * 86400000),
          });
        }

        if (c.status === 'Resolved' || c.status === 'Reopened') {
          await StatusHistory.create({
            complaint: c._id,
            actor: anita._id,
            actorName: anita.name,
            actorRole: anita.role,
            fromStatus: 'Work Completed',
            toStatus: 'Resolved',
            remarks: 'Resolution verified and closed by Warden.',
            timestamp: new Date(Date.now() - 12 * 3600000),
          });
        }

        if (c.status === 'Reopened') {
          await StatusHistory.create({
            complaint: c._id,
            actor: alex._id,
            actorName: alex.name,
            actorRole: alex.role,
            fromStatus: 'Resolved',
            toStatus: 'Reopened',
            remarks: 'Student requested reopen: Runner collapsed again; screw hole stripped.',
            timestamp: new Date(),
          });
        }
      } else {
        existing.student = cData.student;
        existing.studentName = cData.studentName;
        existing.hostelName = cData.hostelName;
        existing.block = cData.block;
        existing.roomNumber = cData.roomNumber;
        existing.category = cData.category;
        existing.title = cData.title;
        existing.description = cData.description;
        existing.priority = cData.priority;
        existing.status = cData.status;
        existing.isDemo = true;
        if (cData.assignedTechnician) {
          existing.assignedTechnician = cData.assignedTechnician;
          existing.assignedTechnicianName = cData.assignedTechnicianName;
        }
        await existing.save();
        console.log(`   ✅ Complaint updated: ${existing.referenceId} (${existing.hostelName}, ${existing.status})`);
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

// Direct execution when run directly via `node` / `tsx` / `ts-node` (not when imported)
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
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

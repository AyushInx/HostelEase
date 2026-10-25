import bcrypt from 'bcryptjs';
import { Hostel, IHostel, IHostelBlock } from '../models/Hostel';
import { User, IUser, UserRole } from '../models/User';
import { AuthUserPayload } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { auditService } from './audit.service';

export class StaffService {
  async getHostels(): Promise<IHostel[]> {
    return Hostel.find().sort({ name: 1 });
  }

  async addHostelBlock(
    hostelId: string,
    blockData: { name: string; floors: number; roomsCount: number },
    user: AuthUserPayload
  ): Promise<IHostel> {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new AppError('Hostel record not found', 404);

    const exists = hostel.blocks.some((b: IHostelBlock) => b.name.toLowerCase() === blockData.name.toLowerCase());
    if (exists) {
      throw new AppError(`Block '${blockData.name}' already exists in ${hostel.name}.`, 409);
    }

    hostel.blocks.push(blockData as IHostelBlock);
    await hostel.save();

    await auditService.record({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'ADD_HOSTEL_BLOCK',
      targetEntity: 'Hostel',
      entityId: hostel.name,
      details: `Added new block '${blockData.name}' (${blockData.floors} floors, ${blockData.roomsCount} rooms).`,
    });

    return hostel;
  }

  async getStaff(role?: string): Promise<IUser[]> {
    const query: any = { role: { $in: ['Caretaker', 'Technician', 'Warden', 'Hostel Admin'] } };
    if (role && role !== 'All') {
      query.role = role;
    }
    return User.find(query).select('-passwordHash').sort({ createdAt: -1 });
  }

  async provisionStaff(
    data: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      hostelName?: string;
      specialization?: string;
    },
    adminUser: AuthUserPayload
  ): Promise<IUser> {
    const existing = await User.findOne({ email: data.email.toLowerCase().trim() });
    if (existing) {
      throw new AppError(`An account with email '${data.email}' already exists.`, 409);
    }

    const defaultPass = data.password || 'StaffPass2026!';
    const passwordHash = await bcrypt.hash(defaultPass, 10);

    const staff = new User({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      hostelName: data.hostelName,
      specialization: data.specialization,
      eligibilityStatus: 'approved',
    });

    await staff.save();

    await auditService.record({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: 'PROVISION_STAFF',
      targetEntity: 'Staff',
      entityId: staff.email,
      details: `Provisioned ${staff.role} account for ${staff.name} (${staff.email}).`,
    });

    return staff;
  }

  async toggleStaffStatus(staffId: string, adminUser: AuthUserPayload): Promise<IUser> {
    const staff = await User.findById(staffId);
    if (!staff) throw new AppError('Staff account not found', 404);

    if (staff.role === 'Hostel Admin' && staff._id.toString() === adminUser.id) {
      throw new AppError('You cannot suspend your own administrative account.', 400);
    }

    const previousStatus = staff.eligibilityStatus;
    staff.eligibilityStatus = previousStatus === 'approved' ? 'suspended' : 'approved';
    await staff.save();

    await auditService.record({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: 'TOGGLE_STAFF_STATUS',
      targetEntity: 'Staff',
      entityId: staff.email,
      details: `Account status transitioned from ${previousStatus} to ${staff.eligibilityStatus}.`,
    });

    return staff;
  }
}

export const staffService = new StaffService();

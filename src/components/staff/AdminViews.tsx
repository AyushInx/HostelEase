import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  CheckCircle2, 
  Ban, 
  Search
} from 'lucide-react';
import type { UserRole } from '../../types/auth';
import type { HostelRecord, StaffAccount, AuditLogEntry } from '../../services/mockStaffAdminService';
import { staffAdminService } from '../../services/mockStaffAdminService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';

// -------------------------------------------------------------
// 1. Hostel & Block Configuration View (Admin)
// -------------------------------------------------------------
export const HostelConfigView: React.FC = () => {
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<HostelRecord | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [floors, setFloors] = useState(4);
  const [rooms, setRooms] = useState(120);
  const [error, setError] = useState<string | null>(null);

  const loadHostels = async () => {
    const data = await staffAdminService.getHostels();
    setHostels(data);
    if (!selectedHostel && data.length > 0) {
      setSelectedHostel(data[0]);
    } else if (selectedHostel) {
      const refreshed = data.find((h) => h.id === selectedHostel.id);
      if (refreshed) setSelectedHostel(refreshed);
    }
  };

  useEffect(() => {
    loadHostels();
  }, []);

  const handleAddBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostel) return;
    if (!blockName.trim()) {
      setError('Block name is required');
      return;
    }

    try {
      await staffAdminService.addHostelBlock(selectedHostel.id, blockName, floors, rooms);
      setBlockName('');
      setIsAddBlockOpen(false);
      setError(null);
      await loadHostels();
    } catch (err: any) {
      setError(err.message || 'Failed to add block');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Hostel & Block Management</h3>
          <p className="text-xs text-slate-500">Configure residential hostel boundaries, blocks, and management personnel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {hostels.map((h) => (
          <div
            key={h.id}
            onClick={() => setSelectedHostel(h)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedHostel?.id === h.id
                ? 'bg-white border-indigo-500 ring-2 ring-indigo-100 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-base text-slate-900">{h.name}</span>
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {h.code}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 mb-4">
              <div>
                <span className="text-slate-400 font-medium">Designated Caretaker:</span>
                <p className="font-semibold text-slate-800">{h.caretakerName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Hostel Warden:</span>
                <p className="font-semibold text-slate-800">{h.wardenName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Configured Blocks:</span>
                <p className="font-semibold text-slate-800">
                  {h.blocks.length} {h.blocks.length === 1 ? 'Residential Block' : 'Residential Blocks'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-indigo-600 font-semibold">Select to inspect blocks</span>
              <span className="text-[11px] text-slate-400">Total capacity ~{h.blocks.reduce((acc, b) => acc + b.roomsCount, 0)} rooms</span>
            </div>
          </div>
        ))}
      </div>

      {selectedHostel && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-base text-slate-900">
                {selectedHostel.name} Block Breakdown
              </h4>
              <p className="text-xs text-slate-500">Configured wings and room allotments for complaint mapping.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddBlockOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add New Block
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedHostel.blocks.map((blk) => (
              <div key={blk.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-sm text-slate-900">{blk.name}</span>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{blk.floors} Floors {blk.floors === 8 ? '(0-7)' : ''}</span>
                  <span>{blk.roomsCount} Rooms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {isAddBlockOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Add Block to {selectedHostel?.name}</h4>
              <button type="button" onClick={() => setIsAddBlockOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

            <form onSubmit={handleAddBlockSubmit} className="space-y-3">
              <Input
                label="Block Name"
                required
                placeholder="e.g. C Block / South Wing"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Floors</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={floors}
                    onChange={(e) => setFloors(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rooms Count</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={rooms}
                    onChange={(e) => setRooms(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setIsAddBlockOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Add Block
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2. Staff Management View (Admin)
// -------------------------------------------------------------
export const StaffManagementView: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Caretaker');
  const [newHostel, setNewHostel] = useState('C.V.R Hostel');
  const [newSpec, setNewSpec] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStaff = async () => {
    const list = await staffAdminService.getStaffAccounts();
    setStaffList(list);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleToggleStatus = async (staffId: string) => {
    await staffAdminService.toggleStaffStatus(staffId);
    await loadStaff();
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Name and Email are required.');
      return;
    }

    try {
      await staffAdminService.createStaffAccount({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        hostelName: newRole !== 'Technician' ? newHostel : undefined,
        specialization: newRole === 'Technician' ? newSpec : undefined,
        status: 'active',
      });
      setIsAddStaffOpen(false);
      setNewName('');
      setNewEmail('');
      setError(null);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to create staff account');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Staff Accounts & Role Assignments</h3>
          <p className="text-xs text-slate-500">
            <strong>SPEC Invariant:</strong> Staff accounts can ONLY be provisioned by a Hostel Admin. No self-registration.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddStaffOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Provision Staff Account
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Jurisdiction / Specialization</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Administrative Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{s.email}</td>
                <td className="py-3.5 px-4">
                  <Badge variant={s.role === 'Hostel Admin' ? 'danger' : s.role === 'Warden' ? 'purple' : s.role === 'Technician' ? 'info' : 'warning'} size="sm">
                    {s.role}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  {s.hostelName || s.specialization || 'Cross-Hostel Administration'}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                    s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {s.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {s.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {s.role !== 'Hostel Admin' && (
                    <Button
                      variant={s.status === 'active' ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleStatus(s.id)}
                    >
                      {s.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Provision Staff Account</h4>
              <button type="button" onClick={() => setIsAddStaffOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Ramesh Chandra"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <Input
                label="Staff Institutional Email"
                required
                type="email"
                placeholder="e.g. ramesh.c@iitp.ac.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Caretaker">Caretaker</option>
                  <option value="Technician">Technician</option>
                  <option value="Warden">Warden</option>
                </select>
              </div>

              {newRole === 'Technician' ? (
                <Input
                  label="Trade / Specialization"
                  required
                  placeholder="e.g. Electrician, Plumbing, HVAC"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                />
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel Jurisdiction</label>
                  <select
                    value={newHostel}
                    onChange={(e) => setNewHostel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="C.V.R Hostel">C.V.R Hostel</option>
                    <option value="Kalam Hostel">Kalam Hostel</option>
                    <option value="Aryabhatta Hostel">Aryabhatta Hostel</option>
                    <option value="Asima Hostel">Asima Hostel</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={() => setIsAddStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 3. Immutable Audit Log View (Admin)
// -------------------------------------------------------------
export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    staffAdminService.getAuditLogs().then(setLogs);
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">System Audit Trail</h3>
          <p className="text-xs text-slate-500">Append-only, immutable record of all lifecycle events, role changes, and actions.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target</th>
              <th className="py-3 px-4">Entity ID</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-slate-800 font-bold whitespace-nowrap">
                  {entry.actorName} <span className="text-slate-400 font-normal">({entry.actorRole})</span>
                </td>
                <td className="py-3 px-4">
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                    {entry.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{entry.targetEntity}</td>
                <td className="py-3 px-4 text-indigo-700 font-bold whitespace-nowrap">{entry.entityId}</td>
                <td className="py-3 px-4 text-slate-700 font-sans max-w-sm truncate">{entry.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

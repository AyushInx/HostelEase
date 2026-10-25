import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  Layers, 
  Users, 
  MapPin, 
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintOverviewStats, 
  ComplaintStatus 
} from '../types/complaint';
import { complaintService } from '../services/mockComplaintService';
import { useAuth } from '../context/AuthContext';
import { ComplaintStatsCard } from '../components/complaints/ComplaintStatsCard';
import { MyComplaintsTab } from '../components/complaints/MyComplaintsTab';
import { CommunityFeedTab } from '../components/complaints/CommunityFeedTab';
import { CreateComplaintModal } from '../components/complaints/CreateComplaintModal';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'my_complaints' | 'community'>('my_complaints');
  const [stats, setStats] = useState<ComplaintOverviewStats>({
    total: 0,
    submitted: 0,
    inProgress: 0,
    resolved: 0,
    reopened: 0,
  });

  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [communityComplaints, setCommunityComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | 'All'>('All');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const studentId = user?.id || 'usr_mock_std_001';
  const studentName = user?.name || 'Alex Sharma';
  const hostelName = user?.hostelName || 'Mandakini Hostel';
  const roomNumber = user?.roomNumber || 'B-304';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStats, fetchedMy, fetchedCommunity] = await Promise.all([
        complaintService.getOverviewStats(studentId, hostelName),
        complaintService.getMyComplaints(studentId, {
          search: searchQuery,
          status: selectedStatus,
          category: selectedCategory,
        }),
        complaintService.getCommunityFeed(hostelName),
      ]);

      setStats(fetchedStats);
      setMyComplaints(fetchedMy);
      setCommunityComplaints(fetchedCommunity);
    } catch (err) {
      console.error('Failed to load complaint data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, hostelName, searchQuery, selectedStatus, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSuccess = () => {
    loadData();
  };

  const handleComplaintUpdated = (updated: Complaint) => {
    setSelectedComplaint(updated);
    loadData();
  };

  const handleStatsFilter = (status: ComplaintStatus | 'All') => {
    setActiveTab('my_complaints');
    setSelectedStatus(status);
  };

  return (
    <div className="space-y-8 py-2">
      {/* Top Banner with Student Profile & Action */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Maintenance Hub
            </h1>
            <Badge variant="primary" size="sm">
              {user?.eligibilityStatus === 'approved' ? 'Active Resident' : 'Eligibility Pending'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-slate-700">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              {studentName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {hostelName}, Room {roomNumber}
            </span>
            <span>•</span>
            <span className="text-slate-400">Institutional ID Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            aria-label="Refresh complaint data"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            New Complaint
          </Button>
        </div>
      </div>

      {/* Overview Metric Counters */}
      <section aria-label="Complaint Overview Statistics">
        <ComplaintStatsCard
          stats={stats}
          selectedStatus={selectedStatus}
          onSelectStatus={handleStatsFilter}
        />
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Dashboard Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('my_complaints')}
            className={`
              pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer
              ${activeTab === 'my_complaints'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}
            `}
            aria-selected={activeTab === 'my_complaints'}
            role="tab"
          >
            <Layers className="w-4 h-4" />
            <span>My Complaints</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-extrabold">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`
              pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer
              ${activeTab === 'community'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}
            `}
            aria-selected={activeTab === 'community'}
            role="tab"
          >
            <Users className="w-4 h-4" />
            <span>{hostelName} Community Board</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 font-extrabold">
              {communityComplaints.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'my_complaints' ? (
        <section aria-label="My Complaints List">
          <MyComplaintsTab
            complaints={myComplaints}
            isLoading={isLoading}
            onOpenDetail={(c) => setSelectedComplaint(c)}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>
      ) : (
        <section aria-label="Hostel Community Board">
          <CommunityFeedTab
            complaints={communityComplaints}
            isLoading={isLoading}
            currentStudentId={studentId}
            currentStudentName={studentName}
            hostelName={hostelName}
            onRefresh={loadData}
          />
        </section>
      )}

      {/* New Complaint Modal */}
      <CreateComplaintModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        studentId={studentId}
        studentName={studentName}
        defaultHostelName={hostelName}
        defaultRoomNumber={roomNumber}
      />

      {/* Ticket Details & Timeline Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={Boolean(selectedComplaint)}
        onClose={() => setSelectedComplaint(null)}
        onComplaintUpdated={handleComplaintUpdated}
        currentStudentId={studentId}
      />
    </div>
  );
};

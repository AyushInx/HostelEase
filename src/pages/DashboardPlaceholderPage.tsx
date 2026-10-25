import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { StudentDashboardPage } from './StudentDashboardPage';
import { StaffDashboardPage } from './StaffDashboardPage';

export const DashboardPlaceholderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Alert type="warning" title="Not Authenticated">
          You are not currently logged in. Please sign in via the Student or Staff portal.
        </Alert>
        <div className="mt-4">
          <Button variant="primary" onClick={() => navigate('/')}>
            Go to Landing Page
          </Button>
        </div>
      </div>
    );
  }

  // Student Hub (Phase 2)
  if (user.role === 'Student') {
    return <StudentDashboardPage />;
  }

  // Staff Hub: Caretaker, Technician, Warden, Hostel Admin (Phase 3)
  return <StaffDashboardPage />;
};

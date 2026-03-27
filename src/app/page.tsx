import AdminDashboard from '@/components/dashboards/admin-dashboard';
import ClientDashboard from '@/components/dashboards/client-dashboard';
import DriverDashboard from '@/components/dashboards/driver-dashboard';
import { mockUsers } from '@/lib/mock-data';
import type { User } from '@/lib/types';

// In a real app, you'd get the current user from an auth session.
// We'll simulate this by allowing you to switch the user index.
const currentUser: User = mockUsers[0]; // 0: client, 1: driver, 2: admin

export default function Home() {
  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'client':
        return <ClientDashboard user={currentUser} />;
      case 'driver':
        return <DriverDashboard user={currentUser} />;
      case 'admin':
        return <AdminDashboard user={currentUser} />;
      default:
        return <div>مرحباً بك في أبشر!</div>;
    }
  };

  return <div className="w-full">{renderDashboard()}</div>;
}

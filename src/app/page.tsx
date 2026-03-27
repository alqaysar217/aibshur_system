import AdminDashboard from '@/components/dashboards/admin-dashboard';
import ClientDashboard from '@/components/dashboards/client-dashboard';
import DriverDashboard from '@/components/dashboards/driver-dashboard';
import { mockUsers } from '@/lib/mock-data';
import type { User } from '@/lib/types';

// In a real app, you'd get the current user from an auth session.
// We'll simulate this by allowing you to switch the user index.
const userIndex = 0; // 0: client, 1: driver, 2: admin
const currentUser: User | undefined = mockUsers[userIndex]; 

export default function Home() {

  if (!currentUser) {
    // This will be replaced by the city selection / auth flow
    return <div className="w-full text-center p-8">Welcome to Absher! Data is being prepared.</div>;
  }


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

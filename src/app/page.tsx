import AdminDashboard from '@/components/dashboards/admin-dashboard';
import { mockAdminUser } from '@/lib/mock-data';

export default function Home() {
  // Bypassing auth and directly showing the Admin Dashboard with a mock admin user.
  return <div className="w-full"><AdminDashboard user={mockAdminUser} /></div>;
}

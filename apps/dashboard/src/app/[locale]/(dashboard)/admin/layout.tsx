import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { verifyAdminAccess } from '@/lib/admin/admin-access-control-guard';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession();

  // Check authentication
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Verify admin access
  const isAdmin = await verifyAdminAccess(session.user.id);
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>
        <p className="text-gray-400 mt-1">
          System administration and tenant management
        </p>
      </div>

      {/* Admin Content */}
      {children}
    </div>
  );
}

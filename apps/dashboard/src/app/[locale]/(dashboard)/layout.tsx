import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { GuildProvider } from '@/context/guild-context';
import { SidebarProvider } from '@/context/sidebar-context';
import { LoadingProvider } from '@/context/loading-context';
import { AnimatedContent } from '@/components/layout/animated-content';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CommandPalette } from '@/components/command-palette';
import { LoadingOverlay } from '@/components/loading-overlay';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <GuildProvider>
        <LoadingProvider>
          <CommandPalette />
          <LoadingOverlay />
          <div className="min-h-screen bg-[hsl(200_25%_12%)] dark:bg-[hsl(200_25%_12%)] light:bg-[hsl(180_20%_97%)] text-foreground">
            <Sidebar />
            <DashboardShell>
              <Header />
              <main className="p-6">
                <ErrorBoundary>
                  <AnimatedContent>{children}</AnimatedContent>
                </ErrorBoundary>
              </main>
            </DashboardShell>
          </div>
        </LoadingProvider>
      </GuildProvider>
    </SidebarProvider>
  );
}

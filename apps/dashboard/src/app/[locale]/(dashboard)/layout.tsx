import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { GuildProvider } from '@/context/guild-context';
import { SidebarProvider } from '@/context/sidebar-context';
import { AnimatedContent } from '@/components/layout/animated-content';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CommandPalette } from '@/components/command-palette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <GuildProvider>
        <CommandPalette />
        <div className="min-h-screen bg-[hsl(200_25%_12%)] dark:bg-[hsl(200_25%_12%)] light:bg-[hsl(180_20%_97%)] text-foreground">
          <Sidebar />
          <DashboardShell>
            <Header />
            <main className="p-6">
              <AnimatedContent>{children}</AnimatedContent>
            </main>
          </DashboardShell>
        </div>
      </GuildProvider>
    </SidebarProvider>
  );
}

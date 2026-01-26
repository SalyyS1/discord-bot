'use client';

interface AnimatedContentProps {
  children: React.ReactNode;
}

// Simplified - no animations for faster page loads
export function AnimatedContent({ children }: AnimatedContentProps) {
  return <div className="animate-slide-in">{children}</div>;
}

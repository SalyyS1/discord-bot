import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export const mdxComponents = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        'text-4xl font-bold text-white mb-6 mt-8 scroll-m-20',
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        'text-3xl font-semibold text-white mb-4 mt-8 pb-2 border-b border-white/10 scroll-m-20',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        'text-2xl font-semibold text-white mb-3 mt-6 scroll-m-20',
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className={cn(
        'text-xl font-semibold text-white mb-2 mt-4 scroll-m-20',
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('text-gray-300 leading-7 mb-4', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={cn('list-disc list-inside text-gray-300 mb-4 space-y-2', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className={cn('list-decimal list-inside text-gray-300 mb-4 space-y-2', className)}
      {...props}
    />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={cn('ml-4', className)} {...props} />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-cyan-400 text-sm font-mono',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className={cn(
        'p-4 rounded-xl bg-black/60 border border-white/10 overflow-x-auto mb-4 text-sm',
        className
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        'border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-500/10 rounded-r-lg mb-4 text-gray-300 italic',
        className
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }: React.HTMLAttributes<HTMLAnchorElement>) => (
    <a
      className={cn(
        'text-cyan-400 hover:text-cyan-300 underline underline-offset-4',
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className={cn('border-white/10 my-8', className)} {...props} />
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
      <table
        className={cn('w-full border-collapse text-gray-300', className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        'border border-white/10 px-4 py-2 bg-white/5 text-left font-semibold text-white',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn('border border-white/10 px-4 py-2', className)}
      {...props}
    />
  ),
};

// Callout components for MDX
export function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      icon: Info,
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-400',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      text: 'text-yellow-400',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={cn('p-4 rounded-xl border mb-4', style.bg)}>
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.text)} />
        <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

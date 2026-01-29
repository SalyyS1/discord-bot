import type { MDXComponents } from 'mdx/types';
import { mdxComponents } from '@/components/docs/mdx-content-components';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...mdxComponents,
    ...components,
  };
}

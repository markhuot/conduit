import type { ReactNode } from 'react';

/**
 * Default HTML layout for server-side rendering
 * 
 * Provides the complete HTML document structure including:
 * - DOCTYPE and html tag
 * - Head element (populated by react-helmet-async during SSR)
 * - Body with root element for React components
 * 
 * This layout receives the rendered component as children
 * and wraps it with proper HTML structure.
 * 
 * Page components use react-helmet-async's <Helmet> to set:
 * - Page title
 * - Meta tags
 * - Link tags
 * - Scripts
 * - Any other head elements
 */

export interface DefaultLayoutProps {
  /**
   * The rendered React component to display in the page
   */
  children: ReactNode;
  
  /**
   * Root element ID for React mounting (default: 'root')
   */
  rootId?: string;
}

export function DefaultLayout({
  children,
  rootId = 'root',
}: DefaultLayoutProps) {
  return (
    <html lang="en" data-layout="default">
      <head></head>
      <body>
        <div id={rootId}>{children}</div>
      </body>
    </html>
  );
}

import type { ReactNode } from 'react';

/**
 * Example custom layout for demonstration purposes
 * 
 * This shows how users can create their own layouts
 * with different structure, styling, or features.
 * 
 * Page components use react-helmet-async's <Helmet> to manage head content.
 */

export interface CustomLayoutProps {
  children: ReactNode;
  theme?: 'light' | 'dark';
  rootId?: string;
}

export function CustomLayout({
  children,
  theme = 'light',
  rootId = 'app',
}: CustomLayoutProps) {
  const themeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
  
  const themeStyles = `
    .dark-theme { background: #1a1a1a; color: #fff; }
    .light-theme { background: #fff; color: #000; }
  `;
  
  return (
    <html lang="en" className={themeClass} data-layout="custom">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      </head>
      <body>
        <header>
          <nav>Custom Navigation</nav>
        </header>
        <main id={rootId}>{children}</main>
        <footer>
          <p>Custom Footer - {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}

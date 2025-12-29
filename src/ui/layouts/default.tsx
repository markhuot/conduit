import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Default HTML layout for server-side rendering
 * 
 * This layout provides the page structure and metadata.
 * The actual HTML document (<html>, <head>, <body>) is handled by
 * the ui() function in lib/router/react/response.tsx.
 * 
 * Use react-helmet-async's <Helmet> to set:
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
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <>
      <Helmet>
        <html lang="en" />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Project Conduit - Event-sourced CMS</title>
        <meta name="description" content="Event-sourced CMS for LLM-native workflows" />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="text-xl font-semibold">
                  Project Conduit
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    </>
  );
}

// Default export for dynamic imports
export default DefaultLayout;

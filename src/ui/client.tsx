import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

/**
 * Client-side hydration entry point
 * 
 * This runs in the browser after SSR and "hydrates" the static HTML,
 * attaching event listeners and making the page interactive.
 * 
 * The server renders the initial HTML with renderToString(),
 * then this script takes over to enable client-side React features.
 * 
 * Uses dynamic imports to load the exact component that was rendered
 * on the server, identified by the data-component attribute.
 */

// Get the root element that was rendered by the server
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Server must render <div id="root">.');
}

// Get the component name and layout from data attributes set by server
const componentName = rootElement.dataset.component;
const layoutName = rootElement.dataset.layout || 'default';

if (!componentName) {
  throw new Error('No component specified for hydration. Server must set data-component attribute.');
}

// Now we know componentName is defined

/**
 * Dynamically import a component by name
 */
async function importComponent(name: string, type: 'component' | 'layout') {
  const basePath = type === 'component' ? './components' : './layouts';
  
  try {
    // Try to import the component
    const module = await import(`${basePath}/${name}.tsx`);
    
    if (!module.default && !module[name]) {
      throw new Error(`Component ${name} has no default export or named export`);
    }
    
    // Return default export or named export matching the component name
    return module.default || module[name];
  } catch (error) {
    console.error(`Failed to import ${type} ${name}:`, error);
    throw new Error(`Component ${type}/${name}.tsx not found`);
  }
}

/**
 * Hydrate the root element with the component that was rendered on server
 */
async function hydrate() {
  // TypeScript type assertion - we've already validated these exist above
  const root = rootElement as HTMLElement;
  const component = componentName as string;
  
  try {
    // Import the layout component
    const LayoutComponent = await importComponent(layoutName, 'layout');
    
    // Import the page component
    const PageComponent = await importComponent(component, 'component');
    
    // Hydrate with the same component tree the server rendered
    hydrateRoot(
      root,
      <StrictMode>
        <LayoutComponent>
          <PageComponent />
        </LayoutComponent>
      </StrictMode>
    );
    
    console.log(`✅ Hydrated: ${layoutName} layout with ${component} component`);
  } catch (error) {
    console.error('❌ Hydration failed:', error);
    
    // Show error to user in development
    if (import.meta.env.DEV) {
      root.innerHTML = `
        <div style="padding: 2rem; background: #fee; border: 2px solid #c00; margin: 2rem; border-radius: 8px;">
          <h1 style="color: #c00; margin: 0 0 1rem 0;">Hydration Error</h1>
          <pre style="background: white; padding: 1rem; border-radius: 4px; overflow: auto;">${error}</pre>
        </div>
      `;
    }
  }
}

// Start hydration
hydrate();

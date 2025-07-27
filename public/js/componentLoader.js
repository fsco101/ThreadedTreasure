// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
    }

    // Load a component from file with cache-busting
    async loadComponent(componentPath) {
        try {
            // Always append a timestamp query to ensure fresh content
            const fetchPath = `${componentPath}?v=${Date.now()}`;

            const response = await fetch(fetchPath, { 
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath} (${response.status})`);
            }

            const html = await response.text();
            return html;
        } catch (error) {
            console.error('Error loading component:', error);
            return '';
        }
    }

    // Insert component into DOM
    async insertComponent(selector, componentPath) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Element with selector "${selector}" not found`);
            return;
        }

        const componentHTML = await this.loadComponent(componentPath);
        if (componentHTML) {
            element.innerHTML = componentHTML;
            this.loadedComponents.add(componentPath);
        }
    }

    // Generic component loader methods removed
    // Header and footer loading should be handled by individual pages

    // Load multiple components
    async loadComponents(components) {
        const promises = components.map(({ selector, path }) => 
            this.insertComponent(selector, path)
        );
        
        await Promise.all(promises);
    }

    // Initialize common components - now handled by individual pages
    async initializeCommonComponents() {
        // This method is kept for backward compatibility but does nothing
        // Individual pages should handle their own component loading
    }

    // Check if component is loaded
    isComponentLoaded(componentPath) {
        return this.loadedComponents.has(componentPath);
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.loadedComponents.clear();
    }
}

// Create global instance
const componentLoader = new ComponentLoader();

// Auto-initialize when DOM is ready - disabled for header/footer
document.addEventListener('DOMContentLoaded', function() {
    // Automatic component loading removed
    // Pages should handle their own component loading manually
});

// Export for use in other scripts
window.ComponentLoader = ComponentLoader;
window.componentLoader = componentLoader;

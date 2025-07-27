// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
    }

    // Load a component from file
    async loadComponent(componentPath) {
        try {
            // Always bypass cache for header.html to ensure fresh content
            const isHeader = componentPath.includes('header.html');
            const fetchPath = isHeader ? `${componentPath}?v=${Date.now()}` : componentPath;

            const response = await fetch(fetchPath, { 
                cache: isHeader ? 'no-cache' : 'default',
                headers: {
                    'Cache-Control': isHeader ? 'no-cache' : 'default'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath} (${response.status})`);
            }

            const html = await response.text();
            
            // Only cache non-header components
            if (!isHeader) {
                this.cache.set(componentPath, html);
            }
            
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

    // Load header component
    async loadHeader(selector = 'header-placeholder') {
        await this.insertComponent(`#${selector}`, 'components/header.html');
        // After header is loaded, refresh header menus
        if (window.refreshHeaderAuth) window.refreshHeaderAuth();
    }

    // Force reload header (useful for login state changes)
    async reloadHeader(selector = 'header-placeholder') {
        const componentPath = 'components/header.html';
        // Clear any cached version
        this.cache.delete(componentPath);
        this.loadedComponents.delete(componentPath);
        // Load fresh header
        await this.loadHeader(selector);
    }

    // Load footer component
    async loadFooter(selector = 'footer-placeholder') {
        await this.insertComponent(`#${selector}`, 'components/footer.html');
    }

    // Load multiple components
    async loadComponents(components) {
        const promises = components.map(({ selector, path }) => 
            this.insertComponent(selector, path)
        );
        
        await Promise.all(promises);
    }

    // Initialize common components (header + footer)
    async initializeCommonComponents() {
        const components = [
            { selector: '#header-placeholder', path: 'components/header.html' },
            { selector: '#footer-placeholder', path: 'components/footer.html' }
        ];

        await this.loadComponents(components);
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

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if placeholders exist and load components
    if (document.getElementById('header-placeholder')) {
        componentLoader.loadHeader();
    }
    
    if (document.getElementById('footer-placeholder')) {
        componentLoader.loadFooter();
    }
});

// Export for use in other scripts
window.ComponentLoader = ComponentLoader;
window.componentLoader = componentLoader;

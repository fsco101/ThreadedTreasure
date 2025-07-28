// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
    }

    // Load a component from file with cache-busting
    async loadComponent(componentPath) {
        // Add a cache-busting query string
        const fetchPath = `${componentPath}?v=${Date.now()}`;
        const response = await fetch(fetchPath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to load component: ${componentPath}`);
        return await response.text();
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

    // Load multiple components
    async loadComponents(components) {
        const promises = components.map(({ selector, path }) => 
            this.insertComponent(selector, path)
        );
        await Promise.all(promises);
    }

    // Automatically load components based on data-component attribute
    async autoLoadComponents() {
        const nodes = document.querySelectorAll('[data-component]');
        const promises = [];
        nodes.forEach(node => {
            const path = node.getAttribute('data-component');
            if (path) {
                promises.push(this.loadComponent(path).then(html => {
                    node.innerHTML = html;
                    this.loadedComponents.add(path);
                }));
            }
        });
        await Promise.all(promises);
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

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    componentLoader.autoLoadComponents();
});

// Export for use in other scripts
window.ComponentLoader = ComponentLoader;
window.componentLoader = componentLoader;

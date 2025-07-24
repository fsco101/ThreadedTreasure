// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
    }

    // Load a component from file
    async loadComponent(componentPath) {
        try {
            // Check if component is already cached
            if (this.cache.has(componentPath)) {
                return this.cache.get(componentPath);
            }

            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath}`);
            }

            const html = await response.text();
            this.cache.set(componentPath, html);
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
        await this.insertComponent(`#${selector}`, '/components/header.html');
    }

    // Load footer component
    async loadFooter(selector = 'footer-placeholder') {
        await this.insertComponent(`#${selector}`, '/components/footer.html');
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
            { selector: '#header-placeholder', path: '/components/header.html' },
            { selector: '#footer-placeholder', path: '/components/footer.html' }
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

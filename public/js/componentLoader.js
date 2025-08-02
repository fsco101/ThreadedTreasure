// Component Loader Utility
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
        this.componentScripts = new Map([
            ['components/header.html', '/js/header.js'],
            ['../components/header.html', '/js/header.js'],
            // Add more component-script mappings here as needed
        ]);
        this.loadedScripts = new Set();
    }

    // Load a component from file with cache-busting
    async loadComponent(componentPath) {
        // Add a cache-busting query string
        const fetchPath = `${componentPath}?v=${Date.now()}`;
        const response = await fetch(fetchPath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to load component: ${componentPath}`);
        return await response.text();
    }

    // Load associated script for a component
    async loadComponentScript(componentPath) {
        const scriptPath = this.componentScripts.get(componentPath);
        if (scriptPath && !this.loadedScripts.has(scriptPath)) {
            try {
                const script = document.createElement('script');
                script.src = `${scriptPath}?v=${Date.now()}`;
                script.async = true;
                
                // Return a promise that resolves when script is loaded
                return new Promise((resolve, reject) => {
                    script.onload = () => {
                        this.loadedScripts.add(scriptPath);
                        console.log(`✅ Loaded script: ${scriptPath}`);
                        resolve();
                    };
                    script.onerror = () => {
                        console.error(`❌ Failed to load script: ${scriptPath}`);
                        reject(new Error(`Failed to load script: ${scriptPath}`));
                    };
                    document.head.appendChild(script);
                });
            } catch (error) {
                console.error(`❌ Error loading component script: ${scriptPath}`, error);
            }
        }
        return Promise.resolve();
    }

    // Insert component into DOM
    async insertComponent(selector, componentPath) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Element with selector "${selector}" not found`);
            return;
        }
        
        try {
            // Load the component HTML
            const componentHTML = await this.loadComponent(componentPath);
            if (componentHTML) {
                element.innerHTML = componentHTML;
                this.loadedComponents.add(componentPath);
                
                // Load associated script if any
                await this.loadComponentScript(componentPath);
                
                // Execute any inline scripts within the component
                this.executeComponentScripts(element);
                
                // Trigger component loaded event
                this.triggerComponentLoadedEvent(componentPath, element);
                
                console.log(`🔧 Component loaded: ${componentPath}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load component ${componentPath}:`, error);
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
                promises.push(this.loadComponentWithScript(path, node));
            }
        });
        
        await Promise.all(promises);
        console.log(`🎉 All components loaded (${promises.length} total)`);
    }

    // Load component with its associated script
    async loadComponentWithScript(path, node) {
        try {
            // Load component HTML
            const html = await this.loadComponent(path);
            node.innerHTML = html;
            this.loadedComponents.add(path);
            
            // Load associated script
            await this.loadComponentScript(path);
            
            // Execute any inline scripts within the component
            this.executeComponentScripts(node);
            
            // Trigger component loaded event
            this.triggerComponentLoadedEvent(path, node);
            
        } catch (error) {
            console.error(`❌ Failed to load component ${path}:`, error);
        }
    }

    // Execute scripts within a loaded component
    executeComponentScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.head.appendChild(newScript);
            document.head.removeChild(newScript);
        });
    }

    // Trigger component loaded event
    triggerComponentLoadedEvent(path, container) {
        const event = new CustomEvent('componentLoaded', {
            detail: { path, container }
        });
        window.dispatchEvent(event);
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

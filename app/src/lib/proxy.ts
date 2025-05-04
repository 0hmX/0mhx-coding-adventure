import { EventDispatcher } from 'three';

function noop() {}

// Receives event data from the main thread and dispatches it locally
export class ElementProxyReceiver extends EventDispatcher {
    style: any;
    left: number = 0;
    top: number = 0;
    width: number = 0;
    height: number = 0;
    ownerDocument: any;

    constructor() {
        super();
        this.style = {}; // For OrbitControls compatibility
        this.ownerDocument = { defaultView: self }; // For OrbitControls compatibility
    }

    get clientWidth() {
        return this.width;
    }

    get clientHeight() {
        return this.height;
    }

    setPointerCapture() { } // For OrbitControls compatibility
    releasePointerCapture() { } // For OrbitControls compatibility

    getRootNode() { // For OrbitControls compatibility
        return this;
    }

    getBoundingClientRect() {
        return {
            left: this.left,
            top: this.top,
            width: this.width,
            height: this.height,
            right: this.left + this.width,
            bottom: this.top + this.height,
        };
    }

    handleEvent(data: any) {
        if (data.type === 'size') {
            this.left = data.left;
            this.top = data.top;
            this.width = data.width;
            this.height = data.height;
            return;
        }

        // Add no-op preventDefault/stopPropagation for compatibility
        data.preventDefault = noop;
        data.stopPropagation = noop;
        // @ts-ignore
        this.dispatchEvent(data);
    }

    focus() {
        // no-op
    }
}

// Manages multiple proxies if needed (though currently only one)
export class ProxyManager {
    targets: Record<string, ElementProxyReceiver> = {};

    constructor() {
        this.handleEvent = this.handleEvent.bind(this);
    }

    makeProxy(data: { id: string }) {
        const { id } = data;
        if (!this.targets[id]) {
            this.targets[id] = new ElementProxyReceiver();
            console.log(`Proxy created for ID: ${id}`);
        } else {
            console.warn(`Proxy already exists for ID: ${id}`);
        }
    }

    getProxy(id: string): ElementProxyReceiver | undefined {
        return this.targets[id];
    }

    handleEvent(data: { id: string; data: any }) {
        const proxy = this.getProxy(data.id);
        if (proxy) {
            proxy.handleEvent(data.data);
        } else {
            console.warn(`Proxy not found for event target ID: ${data.id}`);
        }
    }

    dispose() {
        // Cleanup if necessary, though proxies might not need explicit disposal
        this.targets = {};
    }
}

// Export a single instance
export const proxyManager = new ProxyManager();
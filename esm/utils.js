const _loadBinaryResource = async (url) => {
    let cache = null;
    const window = self;
    // Try to find if the model data is cached in Web Worker memory.
    if (typeof window === 'undefined') {
        console.debug('`window` is not defined');
    }
    else if (window && window.caches) {
        cache = await window.caches.open('wllama_cache');
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
            const data = await cachedResponse.arrayBuffer();
            const byteArray = new Uint8Array(data);
            return byteArray;
        }
    }
    // Download model and store in cache
    const _promise = new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.responseType = 'arraybuffer';
        req.onload = async (_) => {
            const arrayBuffer = req.response; // Note: not req.responseText
            if (arrayBuffer) {
                const byteArray = new Uint8Array(arrayBuffer);
                if (cache) {
                    await cache.put(url, new Response(arrayBuffer));
                }
                ;
                resolve(byteArray);
            }
        };
        req.onerror = (err) => {
            reject(err);
        };
        req.send(null);
    });
    return await _promise;
};
export const joinBuffers = (buffers) => {
    const totalSize = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const output = new Uint8Array(totalSize);
    output.set(buffers[0], 0);
    for (let i = 1; i < buffers.length; i++) {
        output.set(buffers[i], buffers[i - 1].length);
    }
    return output;
};
/**
 * Load a resource as byte array. If multiple URLs is given, we will assume that the resource is splitted into small files
 * @param url URL (or list of URLs) to resource
 */
export const loadBinaryResource = async (url) => {
    if (Array.isArray(url)) {
        const urls = url;
        if (urls.length === 0) {
            throw Error('The given list of URLs is empty');
        }
        const buffers = await Promise.all(urls.map(u => _loadBinaryResource(u)));
        return joinBuffers(buffers);
    }
    else {
        return _loadBinaryResource(url);
    }
};
const textDecoder = new TextDecoder();
/**
 * Convert list of bytes (number) to text
 * @param buffer
 * @returns a string
 */
export const bufToText = (buffer) => {
    return textDecoder.decode(buffer);
};
/**
 * Get default stdout/stderr config for wasm module
 */
export const getWModuleConfig = (pathConfig) => {
    return {
        noInitialRun: true,
        print: function (text) {
            if (arguments.length > 1)
                text = Array.prototype.slice.call(arguments).join(' ');
            console.log(text);
        },
        printErr: function (text) {
            if (arguments.length > 1)
                text = Array.prototype.slice.call(arguments).join(' ');
            console.warn(text);
        },
        // @ts-ignore
        locateFile: function (filename, basePath) {
            const p = pathConfig[filename];
            console.log(`Loading "${filename}" from "${p}"`);
            return p;
        },
    };
};
/**
 * https://unpkg.com/wasm-feature-detect?module
 * @returns true if browser support multi-threads
 */
export const isSupportMultiThread = () => (async (e) => { try {
    return "undefined" != typeof MessageChannel && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(e);
}
catch (e) {
    return !1;
} })(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]));
export const delay = (ms) => new Promise(r => setTimeout(r, ms));
export const absoluteUrl = (relativePath) => new URL(relativePath, document.baseURI).href;
//# sourceMappingURL=utils.js.map
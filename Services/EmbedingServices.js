// embeddingService.js
let embedder = null;

async function getEmbedder() {
    if (!embedder) {
        // Dynamically import the ESM module
        const { pipeline } = await import('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: false, // Set to true for smaller memory usage if needed
        });
    }
    return embedder;
}

async function embed(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Input text is required and must be a string');
    }

    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean' });
    return output.data; // Returns a 384-dimensional dense vector
}

module.exports = { embed };
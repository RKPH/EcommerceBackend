// qdrantConfig.js
let qdrantClient = null;

async function getQdrantClient() {
    if (!qdrantClient) {
        const { QdrantClient } = await import('@qdrant/js-client-rest');
        qdrantClient = new QdrantClient({
            url: 'http://103.155.161.100:6333',
            apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.SWMCjlnWh7pD_BlK885iwtg30KtPXcngjNkTd8BuFAU',
        });
    }
    return qdrantClient;
}

module.exports = {
    get client() {
        return getQdrantClient();
    },
};
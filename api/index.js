// Vercel serverless entrypoint. All requests are rewritten here (see
// vercel.json); the handler lives in src/main.ts.
module.exports = require('../dist/main').default;

// Vercel serverless entrypoint. All requests are rewritten here (see
// vercel.json); the Nest app is created once per cold start and reused.
const { createApp } = require('../dist/main');

let handlerPromise;

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = createApp().then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance();
    });
  }
  return handlerPromise;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  handler(req, res);
};

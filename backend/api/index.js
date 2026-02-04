const app = require('../server.js');

// Export as Vercel serverless function
module.exports = (req, res) => {
  return app(req, res);
};
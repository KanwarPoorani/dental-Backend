const app = require('../app');
const connectToDatabase = require('../lib/database');

module.exports = async function handler(req, res) {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return res.status(503).json({ error: 'Database connection failed' });
  }

  return app(req, res);
};
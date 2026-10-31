require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectToDatabase = require('./lib/database');

connectToDatabase().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on :${port}`));
  require('./lib/reminders')();
}).catch(e => { console.error('MongoDB connection failed', e.message); process.exit(1); });

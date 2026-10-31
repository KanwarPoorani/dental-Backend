require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '50kb' }));
// Basic abuse protection on all API routes
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const crud = require('./lib/crud');
app.use('/api/manage', require('./routes/manage'));
app.use('/api/services', crud(require('./models/Service'), { publicFilter: { active: true } }));
app.use('/api/dentists', crud(require('./models/Dentist'), { publicFilter: { active: true } }));
app.use('/api/branches', crud(require('./models/Branch'), { idField: 'code', sort: { code: 1 }, publicFilter: { active: true } }));
app.use('/api/faqs', crud(require('./models/Faq'), { publicFilter: { active: true } }));
app.use('/api/articles', crud(require('./models/Article'), { sort: { publishedAt: -1 }, publicFilter: { published: true }, listSelect: '-body' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/google-reviews', require('./routes/googleReviews'));

// Central error handler: turns Mongoose validation errors into 400s
app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError')
    return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join(', ') });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on :${port}`));
  require('./lib/reminders')();
}).catch(e => { console.error('MongoDB connection failed', e.message); process.exit(1); });

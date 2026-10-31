const router = require('express').Router();
const Contact = require('../models/Contact');
const admin = require('./auth');

router.get('/admin', admin, async (_req, res, next) => {
  try {
    const messages = await Contact.find()
      .select('name phone email message createdAt isRead')
      .sort({ createdAt: -1 })
      .lean();
    res.json(messages);
  } catch (e) { next(e); }
});

router.patch('/admin/:id/read', admin, async (req, res, next) => {
  try {
    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true, runValidators: true, projection: 'name phone email message createdAt isRead' },
    ).lean();
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;
    await Contact.create({ name, phone, email, message });
    res.status(201).json({ message: 'Thanks, we received your message.' });
  } catch (e) { next(e); }
});
module.exports = router;

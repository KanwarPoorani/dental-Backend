const router = require('express').Router();
const Review = require('../models/Review');
const adminAuth = require('../middleware/adminAuth');
router.get('/', async (_req, res, next) => {
  try { res.json(await Review.find({ approved: true }).sort({ date: -1 }).limit(12)); } catch (e) { next(e); }
});
router.get('/admin', adminAuth, async (_req, res, next) => {
  try { res.json(await Review.find({ approved: false }).sort({ date: -1 }).lean()); } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try {
    const { patientName, rating, comment, branch } = req.body;
    await Review.create({ patientName, rating, comment, branch }); // approved:false until admin approves
    res.status(201).json({ message: 'Thank you. Your review will appear after approval.' });
  } catch (e) { next(e); }
});
router.patch('/:id/approve', adminAuth, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true, runValidators: true });
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    res.json(review);
  } catch (e) { next(e); }
});
module.exports = router;

const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { freeSlots, startsAt } = require('../lib/availability');
const { notify } = require('../lib/notify');
const { makeToken } = require('../lib/token');
const admin = require('./auth');
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

const phoneLookupPatterns = (value) => {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length < 9 || digits.length > 12) return null;

  const formats = new Set([digits, `0${digits}`, `92${digits}`, `0092${digits}`]);
  return [...formats].map((format) => new RegExp(`^\\+?${format.split('').join('[\\s()-]*')}$`));
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Public: the real free times for a branch + date (opening hours minus bookings)
router.get('/availability', wrap(async (req, res) => {
  res.json({ slots: await freeSlots(String(req.query.branch), String(req.query.date)) });
}));

router.get('/lookup', wrap(async (req, res) => {
  const { phone, email } = req.query;
  if (!phone || !email) return res.status(400).json({ message: 'Phone and email are required to track an appointment.' });
  const patterns = phoneLookupPatterns(phone);
  if (!patterns) return res.status(400).json({ message: 'Enter a valid phone number.' });
  const appt = await Appointment.findOne({
    phone: { $in: patterns },
    email: String(email).trim().toLowerCase(),
  }).sort({ createdAt: -1 });
  if (!appt) return res.status(404).json({ message: 'No appointment found for that contact.' });
  res.json({
    id: appt._id,
    token: makeToken(appt._id),
    name: appt.name,
    phone: appt.phone,
    email: appt.email,
    branch: appt.branch,
    service: appt.service,
    date: appt.date,
    time: appt.time,
    status: appt.status,
    notes: appt.notes,
    canEdit: ['Pending', 'Confirmed'].includes(appt.status) && appt.startsAt - Date.now() > 2 * 3600e3,
  });
}));

// Public: create booking. The slot is re-checked server-side; the unique DB index is the race-condition backstop.
router.post('/', wrap(async (req, res) => {
  const { name, phone, email, branch, service, date, time, notes } = req.body;
  const patientName = String(name || '').trim();
  const patientEmail = String(email || '').trim().toLowerCase();
  const phonePatterns = phoneLookupPatterns(phone || '');
  if (patientName && phonePatterns) {
    const samePatientFilter = {
      name: new RegExp(`^${escapeRegex(patientName)}$`, 'i'),
      phone: { $in: phonePatterns },
      date,
      status: { $ne: 'Cancelled' },
      email: patientEmail ? patientEmail : { $in: [null, ''] },
    };
    if (await Appointment.exists(samePatientFilter)) {
      return res.status(409).json({ message: 'You already have an appointment on this date. Please choose another date or contact the clinic.' });
    }
  }
  if (!(await freeSlots(branch, date)).includes(time)) return res.status(409).json({ message: 'That time is no longer available. Please pick another.' });
  const id = new Appointment()._id;
  const token = makeToken(id);
  let appt;
  try {
    appt = await Appointment.create({ _id: id, name, phone, email, branch, service, date, time, notes, startsAt: startsAt(date, time) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That time was just booked. Please choose another time.' });
    }
    throw error;
  }
  notify(appt, 'received'); // fire-and-forget
  res.status(201).json({ message: 'Appointment requested', id: appt._id, token });
}));

router.get('/counts', admin, wrap(async (_req, res) => {
  res.json({ pending: await Appointment.countDocuments({ status: 'Pending' }) });
}));

router.get('/', admin, wrap(async (req, res) => {
  const filter = {};
  ['branch', 'status', 'date'].forEach((k) => req.query[k] && (filter[k] = String(req.query[k])));
  res.json(await Appointment.find(filter).sort({ date: 1, time: 1 }).limit(500));
}));

// Admin: change status. Confirmed -> email/SMS; Cancelled -> notice (and the slot reopens).
router.patch('/:id/status', admin, wrap(async (req, res) => {
  let a;
  try {
    a = await Appointment.findByIdAndUpdate(req.params.id, { status: req.body.status, reminderSent: false }, { new: true, runValidators: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This appointment time is already booked. Choose another available time before confirming.' });
    }
    throw error;
  }
  if (!a) return res.status(404).json({ message: 'Not found' });
  if (a.status === 'Confirmed') notify(a, 'confirmed');
  if (a.status === 'Cancelled') notify(a, 'cancelled');
  res.json(a);
}));
module.exports = router;

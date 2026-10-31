// Patient self-service via secure link: /manage/<id>.<hmac>.
const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { readToken } = require('../lib/token');
const { freeSlots, startsAt } = require('../lib/availability');
const { notify } = require('../lib/notify');
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

const load = async (req, res, next) => {
  const id = readToken(req.params.token);
  const appt = id && (await Appointment.findById(id).catch(() => null));
  if (!appt) return res.status(404).json({ message: 'This link is not valid.' });
  req.appt = appt;
  next();
};
const beforeCutoff = (a) => a.startsAt - Date.now() > 2 * 3600e3;
const canReschedule = (a) => ['Pending', 'Confirmed'].includes(a.status) && beforeCutoff(a);
const canCancel = (a) => ['Pending', 'Confirmed'].includes(a.status) && beforeCutoff(a);
const view = (a) => ({
  name: a.name,
  branch: a.branch,
  service: a.service,
  date: a.date,
  time: a.time,
  status: a.status,
  canReschedule: canReschedule(a),
  canCancel: canCancel(a),
});

router.get('/:token', load, (req, res) => res.json(view(req.appt)));

router.patch('/:token/reschedule', load, wrap(async (req, res) => {
  const a = req.appt, { date, time } = req.body;
  if (!['Pending', 'Confirmed'].includes(a.status)) return res.status(400).json({ message: 'Only pending or confirmed appointments can be rescheduled online.' });
  if (!beforeCutoff(a)) return res.status(400).json({ message: 'Appointments can only be rescheduled more than 2 hours before the visit. Please call the clinic.' });
  if (!(await freeSlots(a.branch, date, a._id)).includes(time)) return res.status(409).json({ message: 'That time is not available.' });
  Object.assign(a, { date, time, startsAt: startsAt(date, time), status: 'Pending', reminderSent: false });
  try {
    await a.save();
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That time was just booked. Please choose another time.' });
    throw error;
  }
  notify(a, 'rescheduled');
  res.json(view(a));
}));

router.post('/:token/cancel', load, wrap(async (req, res) => {
  if (!canCancel(req.appt)) return res.status(400).json({ message: 'This appointment can no longer be cancelled online. Please call the clinic.' });
  req.appt.status = 'Cancelled';
  await req.appt.save();
  notify(req.appt, 'cancelled');
  res.json(view(req.appt));
}));
module.exports = router;

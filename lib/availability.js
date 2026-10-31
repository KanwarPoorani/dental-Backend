const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');
const STEP = 30, TZ = '+05:00'; // Pakistan time; slot grid = 30 min
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const startsAt = (date, time) => new Date(`${date}T${time}:00${TZ}`);

// Free = inside branch opening hours, not already booked, and at least 1 hour from now.
async function freeSlots(code, date, ignoreId) {
  const branch = await Branch.findOne({ code, active: true });
  if (!branch || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const dow = new Date(`${date}T12:00:00${TZ}`).getUTCDay();
  const h = branch.hours.find((x) => x.day === dow);
  if (!h || h.closed) return [];
  const taken = await Appointment.find({ branch: code, date, status: { $ne: 'Cancelled' }, _id: { $ne: ignoreId } }).distinct('time');
  const out = [];
  for (let m = toMin(h.open); m + STEP <= toMin(h.close); m += STEP) {
    const t = fmt(m);
    if (!taken.includes(t) && startsAt(date, t) > new Date(Date.now() + 3600e3)) out.push(t);
  }
  return out;
}
module.exports = { freeSlots, startsAt };

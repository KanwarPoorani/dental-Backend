// Every 15 min: remind Confirmed patients whose visit starts within 24h. findOneAndUpdate "claims" each
// appointment atomically, so a restart or second server instance can't send duplicates.
const Appointment = require('../models/Appointment');
const { notify } = require('./notify');
module.exports = () => setInterval(async () => {
  try {
    const now = Date.now();
    const due = await Appointment.find({ status: 'Confirmed', reminderSent: false, startsAt: { $gt: new Date(now), $lte: new Date(now + 24 * 3600e3) } });
    for (const a of due) {
      const claimed = await Appointment.findOneAndUpdate({ _id: a._id, reminderSent: false }, { reminderSent: true });
      if (claimed) await notify(a, 'reminder');
    }
  } catch (e) { console.error('reminder job:', e.message); }
}, 15 * 60 * 1000);

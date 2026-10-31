const { Schema, model } = require('mongoose');
const schema = new Schema({
  name:    { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
  phone:   { type: String, required: [true, 'Phone is required'], match: [/^[+0-9\s-]{10,16}$/, 'Enter a valid phone number'] },
  email:   { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'] },
  branch:  { type: String, enum: ['Qasimabad', 'Mithi'], required: true },
  service: { type: String, required: true },
  date:    { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'] },
  time:    { type: String, required: true, match: [/^\d{2}:\d{2}$/, 'Time must be HH:MM'] },
  notes:   { type: String, maxlength: 500 },
  startsAt:     { type: Date, index: true },        // real timestamp, used by the reminder job
  reminderSent: { type: Boolean, default: false },
  status:  { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });
// One active booking per branch/date/time -> prevents double-booking even under race conditions
schema.index({ branch: 1, date: 1, time: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'Completed'] } } });
module.exports = model('Appointment', schema);

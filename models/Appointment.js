const { Schema, model } = require('mongoose');
const appointmentSchema = new Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
  phone: { type: String, required: [true, 'Phone is required'], match: [/^[+\d][\d\s-]{8,16}$/, 'Enter a valid phone number'] },
  email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'] },
  branch: { type: String, enum: ['Qasimabad', 'Mithi'], required: [true, 'Choose a branch'] },
  service: { type: String, required: [true, 'Choose a service'] },
  date: { type: String, required: [true, 'Choose a date'] },
  time: { type: String, required: [true, 'Choose a time'], match: [/^\d{2}:\d{2}$/, 'Invalid time'] },
  notes: { type: String, maxlength: 500 },
  startsAt: { type: Date },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });

appointmentSchema.index(
  { branch: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'Completed'] } } },
);

module.exports = model('Appointment', appointmentSchema);

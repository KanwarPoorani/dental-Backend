const { Schema, model } = require('mongoose');
module.exports = model('Dentist', new Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  photoUrl: String, bio: String, qualifications: [String], specialties: [String],
  schedule: [{ branch: { type: String, enum: ['Qasimabad', 'Mithi'] }, days: [Number], start: String, end: String }],
  order: { type: Number, default: 0 }, active: { type: Boolean, default: true },
}));

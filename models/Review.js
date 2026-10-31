const { Schema, model } = require('mongoose');
module.exports = model('Review', new Schema({
  patientName: { type: String, required: true, trim: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 600 },
  branch: { type: String, enum: ['Qasimabad', 'Mithi'], required: true },
  date: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false }, // moderate before showing publicly
}));

const { Schema, model } = require('mongoose');
module.exports = model('Branch', new Schema({
  code: { type: String, enum: ['Qasimabad', 'Mithi'], required: true, unique: true },
  name: String, city: String, address: String, phone: String, plusCode: String, mapUrl: String,
  lat: Number, lng: Number,
  hours: [{ day: { type: Number, min: 0, max: 6 }, open: String, close: String, closed: Boolean }], // 0 = Sunday
  active: { type: Boolean, default: true },
}));

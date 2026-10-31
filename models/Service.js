const { Schema, model } = require('mongoose');
module.exports = model('Service', new Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  headline: String, description: String, durationMin: Number,
  priceMin: Number, priceMax: Number, priceLabel: String, currency: { type: String, default: 'PKR' }, // leave null = "contact us"
  order: { type: Number, default: 0 }, active: { type: Boolean, default: true },
}));

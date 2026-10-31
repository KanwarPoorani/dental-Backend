const { Schema, model } = require('mongoose');
module.exports = model('Faq', new Schema({
  question: { type: String, required: true }, answer: { type: String, required: true },
  order: { type: Number, default: 0 }, active: { type: Boolean, default: true },
}));

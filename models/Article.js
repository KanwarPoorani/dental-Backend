const { Schema, model } = require('mongoose');
module.exports = model('Article', new Schema({
  title: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  excerpt: String, body: { type: String, required: true }, // plain text; blank line = new paragraph
  published: { type: Boolean, default: true }, publishedAt: { type: Date, default: Date.now },
}));

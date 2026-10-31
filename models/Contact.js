const { Schema, model } = require('mongoose');
module.exports = model('Contact', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: {
    type: String,
    required: [true, 'Phone number is required.'],
    trim: true,
    validate: {
      validator: (value) => {
        const digits = value.replace(/\D/g, '');
        return /^\+?[0-9][0-9\s()-]*[0-9]$/.test(value) && digits.length >= 9 && digits.length <= 15;
      },
      message: 'Enter a valid phone number with 9 to 15 digits.',
    },
  },
  email: { type: String, trim: true, lowercase: true },
  message: { type: String, required: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
}, { timestamps: true }));

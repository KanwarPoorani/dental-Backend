const mongoose = require('mongoose');

let connectionPromise;

module.exports = async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
};

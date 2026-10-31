// Manage-link token = id + HMAC(id). Stateless: nothing extra stored, and it can be re-generated for reminder emails.
const crypto = require('crypto');
const sign = (id) => crypto.createHmac('sha256', process.env.TOKEN_SECRET).update(String(id)).digest('hex');
exports.makeToken = (id) => `${id}.${sign(id)}`;
exports.readToken = (token = '') => {
  const [id, sig] = token.split('.');
  if (!id || !sig) return null;
  const good = Buffer.from(sign(id)), got = Buffer.from(sig);
  return good.length === got.length && require('crypto').timingSafeEqual(good, got) ? id : null;
};

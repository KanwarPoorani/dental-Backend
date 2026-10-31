// Minimal admin guard: send header  x-admin-key: <ADMIN_KEY>.
module.exports = (req, res, next) =>
  process.env.ADMIN_KEY && req.get('x-admin-key') === process.env.ADMIN_KEY
    ? next() : res.status(401).json({ message: 'Unauthorized' });
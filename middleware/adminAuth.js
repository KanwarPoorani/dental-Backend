// Simple shared-secret guard for admin endpoints. Replace with JWT login for multi-user admin.
module.exports = (req, res, next) => {
  if (req.get('x-admin-key') && req.get('x-admin-key') === process.env.ADMIN_KEY) return next();
  res.status(401).json({ error: 'Admin access required.' });
};

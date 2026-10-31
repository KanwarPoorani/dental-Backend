// Public GET list + GET one; admin-only POST/PUT/DELETE. Used for services, dentists, branches, articles, faqs.
const router = require('express').Router;
const admin = require('../routes/auth');
module.exports = (Model, { idField = 'slug', sort = { order: 1 }, publicFilter = {}, listSelect = '' } = {}) => {
  const r = router(), wrap = (fn) => (q, s, n) => fn(q, s).catch(n);
  r.get('/', wrap(async (_, res) => res.json(await Model.find(publicFilter).select(listSelect).sort(sort))));
  r.get('/:key', wrap(async (req, res) => {
    const doc = await Model.findOne({ ...publicFilter, [idField]: req.params.key });
    doc ? res.json(doc) : res.status(404).json({ message: 'Not found' });
  }));
  r.post('/', admin, wrap(async (req, res) => res.status(201).json(await Model.create(req.body))));
  r.put('/:id', admin, wrap(async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));
  r.delete('/:id', admin, wrap(async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.status(204).end(); }));
  return r;
};

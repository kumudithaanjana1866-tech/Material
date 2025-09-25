const Supplier = require('../models/Supplier');

async function listSuppliers(req, res) {
  const data = await Supplier.find().lean();
  res.json(data);
}

async function getSupplier(req, res) {
  const sup = await Supplier.findById(req.params.id).lean();
  if (!sup) return res.status(404).json({ message: 'Supplier not found' });
  res.json(sup);
}

async function createSupplier(req, res) {
  const created = await Supplier.create(req.body);
  res.status(201).json(created);
}

async function updateSupplier(req, res) {
  const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Supplier not found' });
  res.json(updated);
}

async function deleteSupplier(req, res) {
  const deleted = await Supplier.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Supplier not found' });
  res.json({ message: 'Deleted' });
}

module.exports = {
  listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier
};

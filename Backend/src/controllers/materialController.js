const Material = require('../models/Material');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const { weightedAverageCost } = require('../utils/calc');

async function listMaterials(req, res) {
  const { lowStock } = req.query;
  const filter = {};
  let materials = await Material.find(filter).populate('preferredSupplier').lean();
  if (lowStock === '1') {
    materials = materials.filter(m => (m.quantity < m.minStock));
  }
  res.json(materials);
}

async function getMaterial(req, res) {
  const mat = await Material.findById(req.params.id).populate('preferredSupplier').lean();
  if (!mat) return res.status(404).json({ message: 'Material not found' });
  res.json(mat);
}

async function createMaterial(req, res) {
  const { name, category, unit, quantity, minStock, avgUnitCost, lastUnitCost, preferredSupplier } = req.body;
  const created = await Material.create({
    name, category, unit, quantity, minStock,
    avgUnitCost: avgUnitCost || 0,
    lastUnitCost: lastUnitCost || 0,
    preferredSupplier: preferredSupplier || null
  });
  res.status(201).json(created);
}

async function updateMaterial(req, res) {
  const updated = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Material not found' });
  res.json(updated);
}

async function deleteMaterial(req, res) {
  const deleted = await Material.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Material not found' });
  res.json({ message: 'Deleted' });
}

// Receive stock (IN) => updates quantity, avg cost, last cost, logs movement
async function receiveStock(req, res) {
  const { id } = req.params;
  const { supplierId, quantity, unitCost, notes } = req.body;
  if (quantity <= 0 || unitCost <= 0) {
    return res.status(400).json({ message: 'quantity and unitCost must be > 0' });
  }
  const mat = await Material.findById(id);
  if (!mat) return res.status(404).json({ message: 'Material not found' });

  const oldQty = mat.quantity || 0;
  const oldAvg = mat.avgUnitCost || 0;
  const newAvg = weightedAverageCost(oldQty, oldAvg, quantity, unitCost);

  mat.quantity = oldQty + Number(quantity);
  mat.avgUnitCost = newAvg;
  mat.lastUnitCost = unitCost;

  if (supplierId) {
    const sup = await Supplier.findById(supplierId);
    if (sup) {
      // upsert supplier price record on material
      const idx = (mat.supplierPrices || []).findIndex(p => p.supplier?.toString() === sup._id.toString());
      if (idx >= 0) {
        mat.supplierPrices[idx].pricePerUnit = unitCost;
        mat.supplierPrices[idx].lastUpdated = new Date();
      } else {
        mat.supplierPrices.push({ supplier: sup._id, pricePerUnit: unitCost, lastUpdated: new Date() });
      }
      // mirror into supplier materialsOffered by name (optional convenience)
      const offerIdx = (sup.materialsOffered || []).findIndex(o => o.materialName.toLowerCase() === mat.name.toLowerCase());
      if (offerIdx >= 0) {
        sup.materialsOffered[offerIdx].pricePerUnit = unitCost;
        sup.materialsOffered[offerIdx].lastUpdated = new Date();
      } else {
        sup.materialsOffered.push({ materialName: mat.name, unit: mat.unit, pricePerUnit: unitCost });
      }
      await sup.save();
    }
  }

  await mat.save();

  const movement = await StockMovement.create({
    material: mat._id,
    type: 'IN',
    quantity,
    unitCost,
    supplier: supplierId || undefined,
    notes,
    balanceAfter: mat.quantity
  });

  res.json({ material: mat, movement, lowStock: mat.quantity < mat.minStock });
}

// Consume stock (OUT)
async function consumeStock(req, res) {
  const { id } = req.params;
  const { quantity, notes } = req.body;
  if (quantity <= 0) return res.status(400).json({ message: 'quantity must be > 0' });

  const mat = await Material.findById(id);
  if (!mat) return res.status(404).json({ message: 'Material not found' });

  if (mat.quantity < quantity) return res.status(400).json({ message: 'Insufficient stock' });

  mat.quantity = Number(mat.quantity) - Number(quantity);
  await mat.save();

  const movement = await StockMovement.create({
    material: mat._id,
    type: 'OUT',
    quantity,
    notes,
    balanceAfter: mat.quantity
  });

  res.json({ material: mat, movement, lowStock: mat.quantity < mat.minStock });
}

module.exports = {
  listMaterials, getMaterial, createMaterial, updateMaterial, deleteMaterial,
  receiveStock, consumeStock
};

const express = require('express');
const router = express.Router();
const Material = require('../models/Material');

// Cost-per-unit analysis: avg vs last vs best supplier price
router.get('/cost-per-unit', async (req, res) => {
  const mats = await Material.find().populate('supplierPrices.supplier').lean();
  const rows = mats.map(m => {
    const bestOffer = (m.supplierPrices || []).reduce((best, p) => {
      if (!best || p.pricePerUnit < best.pricePerUnit) return p;
      return best;
    }, null);
    return {
      _id: m._id,
      name: m.name,
      unit: m.unit,
      quantity: m.quantity,
      minStock: m.minStock,
      avgUnitCost: m.avgUnitCost,
      lastUnitCost: m.lastUnitCost,
      bestSupplierPrice: bestOffer?.pricePerUnit || null,
      bestSupplierName: bestOffer?.supplier?.name || null,
      lowStock: m.quantity < m.minStock
    };
  });
  res.json(rows);
});

module.exports = router;

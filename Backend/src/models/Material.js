const mongoose = require('mongoose');

const SupplierPriceSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  pricePerUnit: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  category: { type: String, default: 'General' },
  unit: { type: String, default: 'kg' }, // kg, bag, m3, etc.
  quantity: { type: Number, default: 0 }, // on-hand
  minStock: { type: Number, default: 0 }, // threshold for low-stock alert
  avgUnitCost: { type: Number, default: 0 }, // weighted moving average cost
  lastUnitCost: { type: Number, default: 0 },
  preferredSupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierPrices: [SupplierPriceSchema]
}, { timestamps: true });

MaterialSchema.virtual('lowStock').get(function () {
  return this.quantity < this.minStock;
});

MaterialSchema.set('toJSON', { virtuals: true });
MaterialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Material', MaterialSchema);

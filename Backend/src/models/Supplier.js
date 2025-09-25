const mongoose = require('mongoose');

const MaterialOfferSchema = new mongoose.Schema({
  materialName: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  materialsOffered: [MaterialOfferSchema],
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);

const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number }, // for IN
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  notes: { type: String },
  balanceAfter: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', StockMovementSchema);

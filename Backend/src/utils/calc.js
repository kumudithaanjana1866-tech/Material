// Weighted Moving Average for inventory valuation during stock IN
function weightedAverageCost(oldQty, oldAvg, inQty, unitCost) {
  const totalQty = (oldQty || 0) + (inQty || 0);
  if (totalQty <= 0) return 0;
  const totalCost = (oldQty * oldAvg) + (inQty * unitCost);
  return Number((totalCost / totalQty).toFixed(4));
}

module.exports = { weightedAverageCost };

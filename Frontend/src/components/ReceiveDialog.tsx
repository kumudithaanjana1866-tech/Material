import React, { useState } from 'react';

export default function ReceiveDialog({
  onSubmit, onCancel
}: {
  onSubmit: (payload: { supplierId?: string; quantity: number; unitCost: number; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplierId, setSupplierId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  return (
    <div className="card">
      <h3>Receive Stock</h3>
      <div className="row">
        <input type="number" placeholder="Quantity" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/>
        <input type="number" placeholder="Unit Cost" value={unitCost} onChange={e=>setUnitCost(Number(e.target.value))}/>
        <input placeholder="Supplier ID (optional)" value={supplierId} onChange={e=>setSupplierId(e.target.value)} />
      </div>
      <div className="row" style={{marginTop:8}}>
        <input placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{flex:1}}/>
      </div>
      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onSubmit({ supplierId: supplierId || undefined, quantity, unitCost, notes })}>Receive</button>
        <button className="btn outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

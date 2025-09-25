import React, { useState } from 'react';

export default function ConsumeDialog({
  onSubmit, onCancel
}: {
  onSubmit: (payload: { quantity: number; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  return (
    <div className="card">
      <h3>Consume Stock</h3>
      <div className="row">
        <input type="number" placeholder="Quantity" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/>
      </div>
      <div className="row" style={{marginTop:8}}>
        <input placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{flex:1}}/>
      </div>
      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onSubmit({ quantity, notes })}>Consume</button>
        <button className="btn outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

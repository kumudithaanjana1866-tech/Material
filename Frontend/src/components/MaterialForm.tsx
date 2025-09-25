import React, { useState, useEffect } from 'react';
import { Material } from '../types';

export default function MaterialForm({
  initial,
  onSubmit,
  onCancel
}: {
  initial?: Material;
  onSubmit: (m: Material) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Material>(initial || { name:'', unit:'kg', quantity:0, minStock:0, category:'General' });

  useEffect(() => { if (initial) setForm(initial); }, [initial]);

  return (
    <div className="card">
      <h3>{initial? 'Edit Material' : 'Add Material'}</h3>
      <div className="row">
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input placeholder="Category" value={form.category||''} onChange={e=>setForm({...form, category:e.target.value})}/>
        <select value={form.unit||'kg'} onChange={e=>setForm({...form, unit:e.target.value})}>
          <option>kg</option><option>bag</option><option>m3</option><option>pcs</option>
        </select>
        <input type="number" placeholder="Quantity" value={form.quantity||0} onChange={e=>setForm({...form, quantity:Number(e.target.value)})}/>
        <input type="number" placeholder="Min Stock" value={form.minStock||0} onChange={e=>setForm({...form, minStock:Number(e.target.value)})}/>
      </div>
      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onSubmit(form)}>{initial ? 'Update' : 'Create'}</button>
        <button className="btn outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

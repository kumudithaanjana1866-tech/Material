import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';

export default function SupplierForm({
  initial,
  onSubmit,
  onCancel
}: {
  initial?: Supplier;
  onSubmit: (s: Supplier) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Supplier>(initial || { name:'', rating:0 });

  useEffect(() => { if (initial) setForm(initial); }, [initial]);

  return (
    <div className="card">
      <h3>{initial? 'Edit Supplier' : 'Add Supplier'}</h3>
      <div className="row">
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input placeholder="Email" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input placeholder="Phone" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input placeholder="Address" value={form.address||''} onChange={e=>setForm({...form, address:e.target.value})}/>
        <input type="number" placeholder="Rating (0-5)" value={form.rating||0} onChange={e=>setForm({...form, rating:Number(e.target.value)})}/>
      </div>
      <div className="row" style={{marginTop:8}}>
        <button className="btn" onClick={()=>onSubmit(form)}>{initial?'Update':'Create'}</button>
        <button className="btn outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

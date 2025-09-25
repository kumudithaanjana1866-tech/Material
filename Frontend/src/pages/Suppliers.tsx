import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { Supplier } from '../types';
import SupplierForm from '../components/SupplierForm';

type ToastTone = 'ok' | 'err' | 'info';
type Toast = { id: string; title: string; desc?: string; tone?: ToastTone };

export default function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  // -------- Tiny toast system --------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  useEffect(() => { toastsRef.current = toasts; }, [toasts]);

  function pushToast(t: Omit<Toast,'id'>) {
    const id = crypto.randomUUID();
    const toast = { id, ...t };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(curr => curr.filter(x => x.id !== id));
    }, t.tone === 'err' ? 6500 : 4200);
  }

  // -------- Validations (for create/update) --------
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const phoneRx = /^[0-9+()\-\s]{7,20}$/;

  function validateSupplier(s: Supplier): string[] {
    const errs: string[] = [];
    if (!s) return ['Invalid payload.'];
    if (!s.name || !String(s.name).trim()) errs.push('Name is required.');
    if (s.email && !emailRx.test(String(s.email))) errs.push('Email format is invalid.');
    if (s.phone && !phoneRx.test(String(s.phone))) errs.push('Phone format is invalid.');
    if (s.rating != null) {
      const r = Number(s.rating);
      if (Number.isNaN(r) || r < 0 || r > 5) errs.push('Rating must be between 0 and 5.');
    }
    return errs;
  }

  // -------- Data load --------
  async function load() {
    setLoading(true);
    try {
      setRows(await api('/api/suppliers'));
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Failed to load suppliers', desc: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  // -------- CRUD (with validation + toasts) --------
  async function create(s: Supplier) {
    const errs = validateSupplier(s);
    if (errs.length) { pushToast({ tone:'err', title:'Fix form errors', desc: errs.join(' ') }); return; }
    try {
      await api('/api/suppliers', { method:'POST', body: JSON.stringify(s) });
      pushToast({ tone:'ok', title:'Supplier created' });
      setCreating(false);
      await load();
    } catch (err: any) {
      pushToast({ tone:'err', title:'Create failed', desc: err?.message || String(err) });
    }
  }
  async function update(s: Supplier) {
    const errs = validateSupplier(s);
    if (errs.length) { pushToast({ tone:'err', title:'Fix form errors', desc: errs.join(' ') }); return; }
    try {
      await api(`/api/suppliers/${s._id}`, { method:'PUT', body: JSON.stringify(s) });
      pushToast({ tone:'ok', title:'Supplier updated' });
      setEditing(null);
      await load();
    } catch (err: any) {
      pushToast({ tone:'err', title:'Update failed', desc: err?.message || String(err) });
    }
  }
  async function remove(id?: string) {
    if (!id) return;
    if (!confirm('Delete this supplier?')) return;
    try {
      await api(`/api/suppliers/${id}`, { method:'DELETE' });
      pushToast({ tone:'ok', title:'Supplier deleted' });
      await load();
    } catch (err: any) {
      pushToast({ tone:'err', title:'Delete failed', desc: err?.message || String(err) });
    }
  }

  // -------- Reports (CSV + Print) --------
  function toCSV(items: Supplier[]) {
    const header = ['Name','Email','Phone','Address','Rating','Offers (name|price/unit; up to 3)'];
    const lines = items.map(s => {
      const offers = (s.materialsOffered || []).slice(0,3).map(o => {
        const unit = o.unit || 'kg';
        return `${o.materialName} | ${o.pricePerUnit} / ${unit}`;
      }).join('; ');
      const cells = [
        safe(s.name),
        safe(s.email),
        safe(s.phone),
        safe(s.address),
        s.rating ?? '',
        safe(offers)
      ];
      return cells.join(',');
    });
    return [header.join(','), ...lines].join('\r\n');

    function safe(v: any) {
      if (v == null) return '';
      const t = String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    }
  }

  function downloadCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ tone:'ok', title:'CSV exported', desc:`Downloaded ${rows.length} rows.` });
  }

  function printReport() {
    const w = window.open('', '_blank');
    if (!w) return;
    const date = new Date().toLocaleString();
    const rowsHtml = rows.map(s => {
      const offers = (s.materialsOffered || []).slice(0,3).map(o => {
        const unit = o.unit || 'kg';
        return `<div>${esc(o.materialName)} — ${esc(o.pricePerUnit)} / ${esc(unit)}</div>`;
      }).join('');
      return `
        <tr>
          <td>${esc(s.name)}</td>
          <td>
            <div class="muted">${esc(s.email || '-')}</div>
            <div class="muted">${esc(s.phone || '-')}</div>
            <div class="muted">${esc(s.address || '-')}</div>
          </td>
          <td style="text-align:center">${s.rating ?? 0}</td>
          <td>${offers}</td>
        </tr>
      `;
    }).join('');
    w.document.write(`
      <html>
      <head>
        <title>Suppliers Report</title>
        <style>
          body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; margin:24px; color:#111827;}
          h1{margin:0 0 4px;}
          .muted{color:#6b7280; font-size:12px;}
          table{width:100%; border-collapse:collapse; margin-top:16px;}
          th,td{border-bottom:1px solid #e5e7eb; padding:10px 8px; font-size:13px; vertical-align:top;}
          th{background:#f8fafc; text-align:left; color:#374151;}
          td div{line-height:1.4}
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        <h1>Suppliers Report</h1>
        <div class="muted">Generated: ${esc(date)}</div>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Contacts</th><th>Rating</th><th>Offers (examples)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
    pushToast({ tone:'ok', title:'Report ready to print' });
    function esc(s: any) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] as string)); }
  }

  // -------- Helpers --------
  const visibleRows = useMemo(() => rows, [rows]); // reserved for future client-side filters

  return (
    <>
      {/* Light gradient theme + animations */}
      <style>{`
        :root {
          --bg: #f9fafb;
          --card: #ffffff;
          --ink: #111827;
          --muted: #6b7280;
          --primary: #2563eb;
          --primary-2: #3b82f6;
          --ok: #16a34a;
          --bad: #dc2626;
          --surface: #f3f4f6;
        }
        .page-wrap {
          background:
            radial-gradient(900px 300px at 15% -10%, rgba(37,99,235,0.10), transparent 60%),
            radial-gradient(900px 300px at 100% -20%, rgba(16,185,129,0.10), transparent 60%),
            var(--bg);
          min-height: 100%;
          padding: 16px;
          border-radius: 16px;
        }
        .row { display:flex; gap:12px; }
        h2 { color: var(--ink); font-weight: 700; letter-spacing:.2px; margin:0; }
        .muted { color: var(--muted); font-size: 13px; }
        .btn {
          background: linear-gradient(180deg, var(--primary), var(--primary-2));
          color: #fff; border: 0; padding: 10px 14px; border-radius: 12px;
          font-weight: 600; cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
          box-shadow: 0 8px 18px rgba(37,99,235,0.22);
        }
        .btn:hover { filter: brightness(1.05); }
        .btn:active { transform: translateY(1px) scale(.98); }
        .btn.outline {
          background: transparent; color: var(--ink); border: 1px solid #d1d5db; box-shadow: none;
        }
        .btn.secondary {
          background: var(--surface); color: var(--ink); border: 1px solid #e5e7eb;
        }
        .card {
          background: var(--card); border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px;
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
        }
        table { width:100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; }
        thead th {
          position: sticky; top: 0; background:#f3f4f6; color:#374151; font-weight:600;
          text-align:left; font-size:12px; letter-spacing:.3px; border-bottom:1px solid #e5e7eb; padding:12px 10px;
        }
        tbody td {
          border-bottom: 1px solid #f3f4f6; padding: 12px 10px; color: var(--ink); font-size: 14px;
        }
        tbody tr { transition: background .2s ease, transform .2s ease; }
        tbody tr:hover { background: rgba(37,99,235,0.06); transform: translateY(-1px); }
        .rating-badge {
          display:inline-flex; align-items:center; justify-content:center;
          min-width: 36px; height: 26px; padding: 0 8px; border-radius: 999px;
          background: #eef2ff; color:#1d4ed8; border:1px solid #c7d2fe; font-weight:700; font-size:12px;
        }
        /* Loading shimmer */
        .shimmer { position: relative; overflow: hidden; background: #f3f4f6; border-radius: 12px; height: 58px; }
        .shimmer::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,.06), transparent);
          transform: translateX(-100%); animation: shimmer 1.15s infinite;
        }
        @keyframes shimmer { to { transform: translateX(100%); } }
        /* Toasts */
        .toasts {
          position: fixed; right: 18px; bottom: 18px; display:flex; flex-direction:column; gap:10px; z-index:60;
        }
        .toast {
          background: #ffffff; color: var(--ink); border-radius: 12px; padding: 12px 14px;
          border: 1px solid #e5e7eb; box-shadow: 0 10px 24px rgba(0,0,0,.08);
          min-width: 260px; max-width: 360px; animation: pop .2s ease both;
        }
        .toast.ok   { border-left: 4px solid var(--ok); }
        .toast.err  { border-left: 4px solid var(--bad); }
        .toast.info { border-left: 4px solid var(--primary); }
        .toast h4 { margin: 0 0 4px; font-size: 14px; }
        .toast p  { margin: 0; font-size: 12px; color: var(--muted); }
        @keyframes pop { from { opacity:0; transform: translateY(8px) scale(.98) } to { opacity:1; transform:none } }
      `}</style>

      <div className="page-wrap">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2>Suppliers</h2>
            <div className="muted">Manage suppliers and export reports</div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={downloadCSV}>Export CSV</button>
            <button className="btn secondary" onClick={printReport}>Print Report</button>
            <button className="btn" onClick={()=>setCreating(true)}>+ Add Supplier</button>
          </div>
        </div>

        {creating && <div className="card" style={{marginTop:12}}><SupplierForm onSubmit={create} onCancel={()=>setCreating(false)} /></div>}
        {editing &&  <div className="card" style={{marginTop:12}}><SupplierForm initial={editing} onSubmit={update} onCancel={()=>setEditing(null)} /></div>}

        <div className="card" style={{marginTop:12}}>
          {loading ? (
            <>
              <div className="shimmer" />
              <div className="shimmer" style={{ marginTop: 8 }} />
              <div className="shimmer" style={{ marginTop: 8 }} />
            </>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Contacts</th><th>Rating</th><th>Offers (examples)</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(s=>(
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td>
                      <div className="muted">{s.email || '-'}</div>
                      <div className="muted">{s.phone || '-'}</div>
                      <div className="muted">{s.address || '-'}</div>
                    </td>
                    <td><span className="rating-badge">{s.rating ?? 0}</span></td>
                    <td>
                      {(s.materialsOffered || []).slice(0,3).map(o=>(
                        <div key={o.materialName + String(o.lastUpdated)}>
                          {o.materialName} — {o.pricePerUnit} / {o.unit || 'kg'}
                        </div>
                      ))}
                    </td>
                    <td className="row">
                      <button className="btn outline" onClick={()=>setEditing(s)}>Edit</button>
                      <button className="btn outline" onClick={()=>remove(s._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr><td colSpan={5} className="muted" style={{padding:18}}>No suppliers found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tone || 'info'}`}>
            <h4>{t.title}</h4>
            {t.desc && <p>{t.desc}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { Material } from '../types';
import MaterialForm from '../components/MaterialForm';
import ReceiveDialog from '../components/ReceiveDialog';
import ConsumeDialog from '../components/ConsumeDialog';

type ToastTone = 'ok' | 'err' | 'info';
type Toast = { id: string; title: string; desc?: string; tone?: ToastTone };

export default function Materials() {
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Material | null>(null);
  const [creating, setCreating] = useState(false);
  const [receivingFor, setReceivingFor] = useState<Material | null>(null);
  const [consumingFor, setConsumingFor] = useState<Material | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);

  // ---------- Tiny toast system ----------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  useEffect(() => { toastsRef.current = toasts; }, [toasts]);

  function pushToast(t: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const toast = { id, ...t };
    setToasts(prev => [...prev, toast]);
    // auto-dismiss
    setTimeout(() => {
      setToasts(curr => curr.filter(x => x.id !== id));
    }, t.tone === 'err' ? 6500 : 4200);
  }

  // ---------- Validations ----------
  function isNum(n: any) { return typeof n === 'number' && !Number.isNaN(n); }

  function validateMaterial(mat: Material): string[] {
    const errs: string[] = [];
    if (!mat) { errs.push('Invalid payload.'); return errs; }
    if (!mat.name || !String(mat.name).trim()) errs.push('Name is required.');
    if (!mat.category || !String(mat.category).trim()) errs.push('Category is required.');
    if (!mat.unit || !String(mat.unit).trim()) errs.push('Unit is required.');
    if (!isNum(mat.quantity) || (mat.quantity as any) < 0) errs.push('Quantity must be a number ≥ 0.');
    if (!isNum(mat.minStock) || (mat.minStock as any) < 0) errs.push('Min stock must be a number ≥ 0.');
    if (mat.avgUnitCost != null && (!isNum(mat.avgUnitCost) || (mat.avgUnitCost as any) < 0))
      errs.push('Avg cost must be a number ≥ 0.');
    if (mat.lastUnitCost != null && (!isNum(mat.lastUnitCost) || (mat.lastUnitCost as any) < 0))
      errs.push('Last cost must be a number ≥ 0.');
    return errs;
  }

  function validateReceive(payload: any): string[] {
    const errs: string[] = [];
    if (!payload) return ['Invalid payload.'];
    if (!isNum(payload.quantity) || payload.quantity <= 0) errs.push('Receive quantity must be > 0.');
    if (payload.unitCost != null && (!isNum(payload.unitCost) || payload.unitCost < 0)) errs.push('Unit cost must be ≥ 0.');
    return errs;
  }

  function validateConsume(payload: any, material?: Material): string[] {
    const errs: string[] = [];
    if (!payload) return ['Invalid payload.'];
    if (!isNum(payload.quantity) || payload.quantity <= 0) errs.push('Consume quantity must be > 0.');
    if (material && isNum(payload.quantity) && payload.quantity > (material.quantity ?? 0)) {
      errs.push(`Cannot consume more than available (${material.quantity}).`);
    }
    return errs;
  }

  // ---------- Data load ----------
  async function load() {
    setLoading(true);
    try {
      const data = await api<Material[]>(`/api/materials${onlyLow ? '?lowStock=1' : ''}`);
      setRows(data);
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Failed to load materials', desc: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [onlyLow]);

  // ---------- CRUD + stock flows (with validation, toasts) ----------
  async function create(mat: Material) {
    const errs = validateMaterial(mat);
    if (errs.length) { pushToast({ tone: 'err', title: 'Fix form errors', desc: errs.join(' ') }); return; }
    try {
      await api('/api/materials', { method: 'POST', body: JSON.stringify(mat) });
      pushToast({ tone: 'ok', title: 'Material created' });
      setCreating(false);
      await load();
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Create failed', desc: err?.message || String(err) });
    }
  }

  async function update(mat: Material) {
    const errs = validateMaterial(mat);
    if (errs.length) { pushToast({ tone: 'err', title: 'Fix form errors', desc: errs.join(' ') }); return; }
    try {
      await api(`/api/materials/${mat._id}`, { method: 'PUT', body: JSON.stringify(mat) });
      pushToast({ tone: 'ok', title: 'Material updated' });
      setEditing(null);
      await load();
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Update failed', desc: err?.message || String(err) });
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm('Delete this material?')) return;
    try {
      await api(`/api/materials/${id}`, { method: 'DELETE' });
      pushToast({ tone: 'ok', title: 'Material deleted' });
      await load();
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Delete failed', desc: err?.message || String(err) });
    }
  }

  // ---------- Report generation ----------
  function toCSV(items: Material[]) {
    const header = ['Name','Category','Unit','Qty','Min','Status','Avg Cost','Last Cost'];
    const lines = items.map(m => [
      safe(m.name), safe(m.category), safe(m.unit),
      num(m.quantity), num(m.minStock),
      m.lowStock ? 'Low' : 'OK',
      num(m.avgUnitCost), num(m.lastUnitCost)
    ].join(','));
    return [header.join(','), ...lines].join('\r\n');

    function num(n: any) {
      const v = (typeof n === 'number' && !Number.isNaN(n)) ? n : '';
      return typeof v === 'number' ? String(v) : '';
    }
    function safe(s: any) {
      if (s == null) return '';
      const t = String(s);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    }
  }

  function downloadCSV(all: boolean) {
    const data = all ? rows : rows.filter(m => m.lowStock);
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = all ? 'all' : 'low';
    a.download = `materials_${suffix}_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ tone: 'ok', title: 'CSV exported', desc: `Downloaded ${data.length} rows.` });
  }

  function printReport() {
    const w = window.open('', '_blank');
    if (!w) return;
    const date = new Date().toLocaleString();
    const rowsHtml = rows.map(m => `
      <tr>
        <td>${esc(m.name)}</td>
        <td>${esc(m.category)}</td>
        <td>${esc(m.unit)}</td>
        <td style="text-align:right">${esc(m.quantity)}</td>
        <td style="text-align:right">${esc(m.minStock)}</td>
        <td>${m.lowStock ? '<span style="color:#b91c1c;font-weight:600">Low</span>' : '<span style="color:#15803d;font-weight:600">OK</span>'}</td>
        <td style="text-align:right">${m.avgUnitCost != null ? Number(m.avgUnitCost).toFixed(2) : ''}</td>
        <td style="text-align:right">${m.lastUnitCost != null ? Number(m.lastUnitCost).toFixed(2) : ''}</td>
      </tr>
    `).join('');
    w.document.write(`
      <html>
      <head>
        <title>Materials Report</title>
        <style>
          body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; margin:24px; color:#111827;}
          h1{margin:0 0 4px;}
          .muted{color:#6b7280; font-size:12px;}
          table{width:100%; border-collapse:collapse; margin-top:16px;}
          th,td{border-bottom:1px solid #e5e7eb; padding:10px 8px; font-size:13px;}
          th{background:#f8fafc; text-align:left; color:#374151;}
          @media print {
            @page { margin: 14mm; }
          }
        </style>
      </head>
      <body>
        <h1>Materials Report</h1>
        <div class="muted">Generated: ${esc(date)}</div>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Unit</th>
              <th style="text-align:right">Qty</th><th style="text-align:right">Min</th><th>Status</th>
              <th style="text-align:right">Avg Cost</th><th style="text-align:right">Last Cost</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
    pushToast({ tone: 'ok', title: 'Report ready to print' });
    function esc(s: any) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] as string)); }
  }

  // ---------- Helpers ----------
  const visibleRows = useMemo(() => rows, [rows]); // reserve for future client filtering

  return (
    <>
      {/* Modern styles + animations (LIGHT THEME) */}
      <style>{`
        :root {
          --bg: #f9fafb;          /* page background */
          --card: #ffffff;        /* card surfaces */
          --ink: #111827;         /* primary text */
          --muted: #6b7280;       /* secondary text */
          --primary: #2563eb;     /* blue primary */
          --primary-2: #3b82f6;   /* lighter blue for gradient */
          --ring: rgba(37,99,235,0.25);
          --ok: #16a34a;
          --warn: #f59e0b;
          --bad: #dc2626;
          --surface: #f3f4f6;     /* subtle surface */
        }
        .materials-gradient {
          background:
            radial-gradient(900px 300px at 15% -10%, rgba(37,99,235,0.10), transparent 60%),
            radial-gradient(900px 300px at 100% -20%, rgba(16,185,129,0.10), transparent 60%),
            var(--bg);
        }
        .row { display:flex; gap:12px; }
        h2 {
          color: var(--ink);
          font-weight: 700;
          letter-spacing: .2px;
          margin: 0;
        }
        .muted { color: var(--muted); font-size: 13px; }
        .btn {
          background: linear-gradient(180deg, var(--primary), var(--primary-2));
          color: white; border: 0; padding: 10px 14px; border-radius: 12px;
          font-weight: 600; transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
          box-shadow: 0 8px 18px rgba(37,99,235,0.22);
          cursor: pointer;
        }
        .btn:active { transform: translateY(1px) scale(.98); }
        .btn:hover { filter: brightness(1.05); }
        .btn.icon { display:inline-flex; align-items:center; gap:8px; }
        .btn.secondary {
          background: var(--surface); color: var(--ink);
          border: 1px solid #e5e7eb; box-shadow: none;
        }
        .btn.outline {
          background: transparent; color: var(--ink);
          border: 1px solid #d1d5db; box-shadow: none;
        }
        .chip {
          background: #ffffff; color: var(--muted);
          padding: 6px 10px; border-radius: 999px; border:1px solid #e5e7eb;
          transition: background .2s ease;
        }
        .chip input { accent-color: var(--primary) }
        .card {
          background: var(--card);
          border: 1px solid #e5e7eb;
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
          color: var(--ink); border-radius: 16px; padding: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 12px;
        }
        thead th {
          position: sticky; top: 0;
          background: #f3f4f6;
          color: #374151;
          font-weight: 600;
          text-align: left;
          font-size: 12px;
          letter-spacing: .3px;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 10px;
        }
        tbody td {
          border-bottom: 1px solid #f3f4f6;
          padding: 12px 10px;
          color: var(--ink);
          font-size: 14px;
        }
        tbody tr { transition: background .2s ease, transform .2s ease; }
        tbody tr:hover { background: rgba(37,99,235,0.06); transform: translateY(-1px); }
        .badge {
          font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 999px;
          display: inline-block;
        }
        .badge.green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge.red   { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .toolbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0 18px; gap: 12px;
        }
        .toolbar-right { display:flex; align-items:center; gap: 10px; }
        .ghost { opacity: .65; }
        /* Row entrance animation */
        .rise-in {
          animation: rise .35s ease both;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(6px) scale(.995); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Loading shimmer */
        .shimmer {
          position: relative; overflow: hidden; background: #f3f4f6; border-radius: 12px; height: 58px;
        }
        .shimmer::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,.06), transparent);
          transform: translateX(-100%);
          animation: shimmer 1.15s infinite;
        }
        @keyframes shimmer { to { transform: translateX(100%); } }

        /* Toasts */
        .toasts {
          position: fixed; right: 18px; bottom: 18px; display: flex; flex-direction: column; gap: 10px;
          z-index: 60;
        }
        .toast {
          background: #ffffff; color: var(--ink); border-radius: 12px; padding: 12px 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 24px rgba(0,0,0,.08);
          min-width: 260px; max-width: 360px;
          animation: pop .2s ease both;
        }
        .toast.ok   { border-left: 4px solid var(--ok); }
        .toast.err  { border-left: 4px solid var(--bad); }
        .toast.info { border-left: 4px solid var(--primary); }
        .toast h4 { margin: 0 0 4px; font-size: 14px; }
        .toast p  { margin: 0; font-size: 12px; color: var(--muted); }
        @keyframes pop { from { opacity:0; transform: translateY(8px) scale(.98) } to { opacity:1; transform:none } }

        /* Page wrapper */
        .page-wrap {
          background: var(--bg);
          background-attachment: fixed;
          min-height: 100%;
          padding: 16px;
          border-radius: 16px;
        }
      `}</style>

      <div className="page-wrap materials-gradient">
        <div className="toolbar">
          <div>
            <h2>Materials</h2>
            <div className="muted">Track stock, receive/consume, and export reports</div>
          </div>

          <div className="toolbar-right">
            <label className="chip row" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={onlyLow}
                onChange={e => setOnlyLow(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              <span>Only low-stock</span>
            </label>

            {/* Report actions */}
            <button className="btn outline" onClick={() => downloadCSV(true)}>Export CSV (All)</button>
            <button className="btn outline" onClick={() => downloadCSV(false)}>Export CSV (Low)</button>
            <button className="btn secondary" onClick={printReport}>Print Report</button>

            <button className="btn icon" onClick={() => setCreating(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Add Material
            </button>
          </div>
        </div>

        {creating && (
          <div className="card rise-in">
            <MaterialForm onSubmit={create} onCancel={() => setCreating(false)} />
          </div>
        )}
        {editing && (
          <div className="card rise-in">
            <MaterialForm initial={editing} onSubmit={update} onCancel={() => setEditing(null)} />
          </div>
        )}

        {receivingFor && (
          <ReceiveDialog
            onSubmit={async (payload) => {
              const errs = validateReceive(payload);
              if (errs.length) { pushToast({ tone: 'err', title: 'Fix receive errors', desc: errs.join(' ') }); return; }
              try {
                await api(`/api/materials/${receivingFor._id}/receive`, { method: 'POST', body: JSON.stringify(payload) });
                pushToast({ tone: 'ok', title: `Received ${payload.quantity} ${receivingFor.unit} of ${receivingFor.name}` });
                setReceivingFor(null);
                await load();
              } catch (err: any) {
                pushToast({ tone: 'err', title: 'Receive failed', desc: err?.message || String(err) });
              }
            }}
            onCancel={() => setReceivingFor(null)}
          />
        )}

        {consumingFor && (
          <ConsumeDialog
            onSubmit={async (payload) => {
              const errs = validateConsume(payload, consumingFor);
              if (errs.length) { pushToast({ tone: 'err', title: 'Fix consume errors', desc: errs.join(' ') }); return; }
              try {
                await api(`/api/materials/${consumingFor._id}/consume`, { method: 'POST', body: JSON.stringify(payload) });
                pushToast({ tone: 'ok', title: `Consumed ${payload.quantity} ${consumingFor.unit} of ${consumingFor.name}` });
                setConsumingFor(null);
                await load();
              } catch (err: any) {
                pushToast({ tone: 'err', title: 'Consume failed', desc: err?.message || String(err) });
              }
            }}
            onCancel={() => setConsumingFor(null)}
          />
        )}

        <div className="card" style={{ marginTop: 12 }}>
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
                  <th>Name</th><th>Category</th><th>Unit</th>
                  <th>Qty</th><th>Min</th><th>Status</th>
                  <th>Avg Cost</th><th>Last Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((m) => (
                  <tr key={m._id} className="rise-in">
                    <td>{m.name}</td>
                    <td className="ghost">{m.category}</td>
                    <td>{m.unit}</td>
                    <td>{m.quantity}</td>
                    <td className="ghost">{m.minStock}</td>
                    <td>
                      {m.lowStock
                        ? <span className="badge red">Low</span>
                        : <span className="badge green">OK</span>}
                    </td>
                    <td>{m.avgUnitCost != null ? Number(m.avgUnitCost).toFixed(2) : ''}</td>
                    <td>{m.lastUnitCost != null ? Number(m.lastUnitCost).toFixed(2) : ''}</td>
                    <td className="row" style={{ gap: 8 }}>
                      <button className="btn secondary" onClick={() => setReceivingFor(m)}>Receive</button>
                      <button className="btn secondary" onClick={() => setConsumingFor(m)}>Consume</button>
                      <button className="btn outline" onClick={() => setEditing(m)}>Edit</button>
                      <button className="btn outline" onClick={() => remove(m._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr>
                    <td colSpan={9} className="muted" style={{ padding: 18 }}>
                      No materials found{onlyLow ? ' with low stock.' : '.'}
                    </td>
                  </tr>
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

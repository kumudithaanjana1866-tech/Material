import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { CostRow } from '../types';

type ToastTone = 'ok' | 'err' | 'info';
type Toast = { id: string; title: string; desc?: string; tone?: ToastTone };

export default function CostAnalysis() {
  const [rows, setRows] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);

  // -------- Tiny toast system --------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  useEffect(() => { toastsRef.current = toasts; }, [toasts]);

  function pushToast(t: Omit<Toast,'id'>) {
    const id = crypto.randomUUID();
    const toast = { id, ...t };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => setToasts(curr => curr.filter(x => x.id !== id)), t.tone === 'err' ? 6500 : 4200);
  }

  // -------- Data load --------
  async function load() {
    setLoading(true);
    try {
      setRows(await api('/api/reports/cost-per-unit'));
    } catch (err: any) {
      pushToast({ tone: 'err', title: 'Failed to load report', desc: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  // -------- Reports (CSV + Print) --------
  function toCSV(items: CostRow[]) {
    const header = ['Material','Unit','Qty','Min','Status','Avg Cost','Last Cost','Best Supplier','Best Price','Gap (Best vs Avg)'];
    const lines = items.map(r => {
      const avg = safeNum(r.avgUnitCost);
      const best = r.bestSupplierPrice != null ? safeNum(r.bestSupplierPrice) : '';
      const gap = r.bestSupplierPrice != null && r.avgUnitCost != null ? (r.bestSupplierPrice - r.avgUnitCost).toFixed(2) : '';
      const cells = [
        safe(r.name),
        safe(r.unit),
        safe(r.quantity),
        safe(r.minStock),
        r.lowStock ? 'Low' : 'OK',
        avg,
        r.lastUnitCost != null ? safeNum(r.lastUnitCost) : '',
        safe(r.bestSupplierName || '-'),
        best,
        gap
      ];
      return cells.join(',');
    });
    return [header.join(','), ...lines].join('\r\n');

    function safe(v: any) {
      if (v == null) return '';
      const t = String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    }
    function safeNum(n: any) {
      return typeof n === 'number' && !Number.isNaN(n) ? n.toFixed(2) : '';
    }
  }

  function downloadCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost_per_unit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ tone:'ok', title:'CSV exported', desc:`Downloaded ${rows.length} rows.` });
  }

  function printReport() {
    const w = window.open('', '_blank');
    if (!w) return;
    const date = new Date().toLocaleString();
    const rowsHtml = rows.map(r => {
      const avg = r.avgUnitCost != null ? Number(r.avgUnitCost).toFixed(2) : '';
      const last = r.lastUnitCost != null ? Number(r.lastUnitCost).toFixed(2) : '';
      const best = r.bestSupplierPrice != null ? Number(r.bestSupplierPrice).toFixed(2) : '';
      const gap = r.bestSupplierPrice != null && r.avgUnitCost != null ? (r.bestSupplierPrice - r.avgUnitCost) : null;
      const gapTxt = gap != null ? gap.toFixed(2) : '';
      const gapColor = gap == null ? '#374151'
        : gap < 0 ? '#16a34a'   // saving vs avg
        : gap > 0 ? '#b91c1c'   // more expensive than avg
                  : '#374151';
      return `
        <tr>
          <td>${esc(r.name)}</td>
          <td>${esc(r.unit)}</td>
          <td style="text-align:right">${esc(r.quantity)}</td>
          <td style="text-align:right">${esc(r.minStock)}</td>
          <td>${r.lowStock ? '<span style="color:#b91c1c;font-weight:600">Low</span>' : '<span style="color:#15803d;font-weight:600">OK</span>'}</td>
          <td style="text-align:right">${avg}</td>
          <td style="text-align:right">${last}</td>
          <td>${esc(r.bestSupplierName || '-')}</td>
          <td style="text-align:right">${best || '-'}</td>
          <td style="text-align:right;color:${gapColor}">${gapTxt}</td>
        </tr>
      `;
    }).join('');
    w.document.write(`
      <html>
      <head>
        <title>Cost-per-Unit Analysis</title>
        <style>
          body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; margin:24px; color:#111827;}
          h1{margin:0 0 4px;}
          .muted{color:#6b7280; font-size:12px;}
          table{width:100%; border-collapse:collapse; margin-top:16px;}
          th,td{border-bottom:1px solid #e5e7eb; padding:10px 8px; font-size:13px; vertical-align:top;}
          th{background:#f8fafc; text-align:left; color:#374151;}
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        <h1>Cost-per-Unit Analysis</h1>
        <div class="muted">Generated: ${esc(date)}</div>
        <table>
          <thead>
            <tr>
              <th>Material</th><th>Unit</th><th>Qty</th><th>Min</th><th>Status</th>
              <th>Avg Cost</th><th>Last Cost</th><th>Best Supplier</th><th>Best Price</th><th>Gap (Best vs Avg)</th>
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
  const visibleRows = useMemo(() => rows, [rows]);

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
        h2 { color: var(--ink); font-weight:700; letter-spacing:.2px; margin:0; }
        .sub { color: var(--muted); font-size: 13px; }
        .card {
          background: var(--card); border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px;
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
        }
        .row { display:flex; gap:8px; align-items:center; }
        .btn {
          background: linear-gradient(180deg, var(--primary), var(--primary-2));
          color: #fff; border: 0; padding: 10px 14px; border-radius: 12px;
          font-weight: 600; cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
          box-shadow: 0 8px 18px rgba(37,99,235,0.22);
        }
        .btn:hover { filter: brightness(1.05); }
        .btn:active { transform: translateY(1px) scale(.98); }
        .btn.secondary { background: var(--surface); color: var(--ink); border: 1px solid #e5e7eb; box-shadow: none; }
        table { width:100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; }
        thead th {
          position: sticky; top: 0; background:#f3f4f6; color:#374151; font-weight:600;
          text-align:left; font-size:12px; letter-spacing:.3px; border-bottom:1px solid #e5e7eb; padding:12px 10px;
        }
        tbody td { border-bottom:1px solid #f3f4f6; padding:12px 10px; color:var(--ink); font-size:14px; }
        tbody tr { transition: background .2s ease, transform .2s ease; }
        tbody tr:hover { background: rgba(37,99,235,0.06); transform: translateY(-1px); }
        .badge { font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px; display:inline-block; }
        .badge.green { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
        .badge.red   { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
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
        <div className="row" style={{justifyContent:'space-between', marginBottom: 10}}>
          <div>
            <h2>Cost-per-Unit Analysis</h2>
            <div className="sub">Compare weighted average cost, last purchase cost, and best supplier offer; low-stock items are flagged.</div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={downloadCSV}>Export CSV</button>
            <button className="btn secondary" onClick={printReport}>Print Report</button>
          </div>
        </div>

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
                  <th>Material</th><th>Unit</th><th>Qty</th><th>Min</th><th>Status</th>
                  <th>Avg Cost</th><th>Last Cost</th><th>Best Supplier</th><th>Best Price</th><th>Gap (Best vs Avg)</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r=>{
                  const avg = r.avgUnitCost ?? 0;
                  const best = r.bestSupplierPrice ?? avg;
                  const gap = (r.bestSupplierPrice != null && r.avgUnitCost != null) ? (best - avg) : null;
                  const gapClass = gap == null ? '' : gap < 0 ? 'gap-good' : gap > 0 ? 'gap-bad' : '';
                  return (
                    <tr key={r._id}>
                      <td>{r.name}</td>
                      <td>{r.unit}</td>
                      <td>{r.quantity}</td>
                      <td>{r.minStock}</td>
                      <td>{r.lowStock ? <span className="badge red">Low</span> : <span className="badge green">OK</span>}</td>
                      <td>{avg.toFixed(2)}</td>
                      <td>{r.lastUnitCost != null ? r.lastUnitCost.toFixed(2) : ''}</td>
                      <td>{r.bestSupplierName || '-'}</td>
                      <td>{r.bestSupplierPrice != null ? r.bestSupplierPrice.toFixed(2) : '-'}</td>
                      <td className={gapClass}>{gap != null ? gap.toFixed(2) : ''}</td>
                    </tr>
                  );
                })}
                {!visibleRows.length && (
                  <tr><td colSpan={10} style={{ padding:18, color:'#6b7280' }}>No data.</td></tr>
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

      {/* Small inline styles for gap coloring (kept minimal to avoid altering structure) */}
      <style>{`
        .gap-good { color: #16a34a; font-weight: 600; } /* Best price is cheaper than avg (saving) */
        .gap-bad  { color: #b91c1c; font-weight: 600; } /* Best price is higher than avg */
      `}</style>
    </>
  );
}

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO, LOGO_RATIO } from "./logo.js";

// Nombre >= 0 (les valeurs vides ou négatives deviennent 0)
const n = (v) => Math.max(0, parseFloat(v) || 0);
const fmt = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

let nextId = 1;
const uid = () => nextId++;

const css = `
*{box-sizing:border-box}
body{margin:0;background:#faf7f2;color:#2a2420;font:15px/1.5 system-ui,sans-serif}
.w{max-width:820px;margin:0 auto;padding:20px 16px 40px}
h1{margin:0;font-size:24px}h2{font-size:16px;margin:0 0 10px}
.sub{color:#7a6f66;margin:2px 0 18px}
.card{background:#fff;border:1px solid #e6ddd2;border-radius:12px;padding:14px;margin-bottom:14px}
.sc{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:560px}
th{text-align:left;font-size:12px;color:#7a6f66;padding:4px 6px}
td{padding:4px 6px}
input,select{width:100%;padding:7px 8px;border:1px solid #e6ddd2;border-radius:8px;font:inherit}
button{font:inherit;border:1px solid #e6ddd2;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer}
button.p{background:#c2410c;color:#fff;border-color:#c2410c;font-weight:600}
button:disabled{opacity:.45;cursor:not-allowed}
.x{padding:4px 9px;color:#7a6f66}
.row{margin-top:10px}
.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.k div{background:#faf7f2;border-radius:10px;padding:10px}
.k b{display:block;font-size:20px}.k span{font-size:12px;color:#7a6f66}
.r{text-align:right}
.alert{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:10px;padding:10px 12px;margin-bottom:14px}
.alert b{display:block;margin-bottom:4px}
.alert ul{margin:0;padding-left:18px}
.bad input,.bad select{border-color:#dc2626;background:#fef2f2}
.neg{color:#dc2626;font-weight:600}
`;

export default function App() {
  const [date, setDate] = useState(localToday());
  const [prods, setProds] = useState(() => [
    { id: uid(), name: "Fraise", stock: 0, qty: 0 },
    { id: uid(), name: "Betteraves", stock: 0, qty: 0 },
    { id: uid(), name: "Cocktail", stock: 0, qty: 0 },
  ]);
  const [sales, setSales] = useState(() =>
    [1, 2, 3, 4, 5].map((i) => ({ id: uid(), client: "Vente " + i, productId: 1, qty: 0, price: "" }))
  );

  const upP = (id, k, v) => setProds(prods.map((p) => (p.id === id ? { ...p, [k]: v } : p)));
  const upS = (id, k, v) => setSales(sales.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

  // Calculs par produit : disponible = stock initial + production
  const rows = prods.map((p) => {
    const mine = sales.filter((s) => s.productId === p.id);
    const sold = mine.reduce((a, s) => a + n(s.qty), 0);
    const rev = mine.reduce((a, s) => a + n(s.qty) * n(s.price), 0);
    const avail = n(p.stock) + n(p.qty);
    return { id: p.id, name: p.name, stock: n(p.stock), prod: n(p.qty), avail, sold, left: avail - sold, rev };
  });

  const T = {
    avail: rows.reduce((a, r) => a + r.avail, 0),
    sold: rows.reduce((a, r) => a + r.sold, 0),
    rev: rows.reduce((a, r) => a + r.rev, 0),
  };

  // Validation : vendu > disponible (stock + production)
  const errors = rows
    .filter((r) => r.sold > r.avail)
    .map((r) => ({
      id: r.id,
      msg: `${r.name} : ${r.sold} vendu(s) pour ${r.avail} disponible(s) (stock ${r.stock} + production ${r.prod}), soit ${r.sold - r.avail} en trop.`,
    }));
  const badIds = new Set(errors.map((e) => e.id));

  const exportPdf = () => {
    if (errors.length) return;
    const doc = new jsPDF();
    // En-tete : logo + titre + date
    const pageW = doc.internal.pageSize.getWidth();
    const logoW = 40;
    const logoH = logoW / LOGO_RATIO;
    doc.addImage(LOGO, "JPEG", pageW - 14 - logoW, 10, logoW, logoH);
    doc.setFontSize(18);
    doc.text("Compte rendu de production et ventes", 14, 19);
    doc.setFontSize(11);
    doc.text("Date : " + date, 14, 27);
    autoTable(doc, {
      startY: 10 + logoH + 8,
      head: [["Produit", "Stock initial", "Production", "Disponible", "Vendu", "Reste", "CA (Ar)"]],
      body: rows.map((r) => [r.name, r.stock, r.prod, r.avail, r.sold, r.left, fmt(r.rev)]),
      foot: [["Total", "", "", T.avail, T.sold, T.avail - T.sold, fmt(T.rev)]],
      headStyles: { fillColor: [194, 65, 12] },
      footStyles: { fillColor: [240, 230, 220], textColor: 20 },
    });
    const y = doc.lastAutoTable.finalY;
    doc.setFontSize(13);
    doc.text("Detail des ventes (" + sales.length + ")", 14, y + 12);
    autoTable(doc, {
      startY: y + 16,
      head: [["#", "Client", "Produit", "Qte", "Prix unit.", "Total"]],
      body: sales.map((s, i) => [
        i + 1,
        s.client,
        prods.find((p) => p.id === s.productId)?.name || "-",
        n(s.qty),
        fmt(n(s.price)),
        fmt(n(s.qty) * n(s.price)),
      ]),
      headStyles: { fillColor: [194, 65, 12] },
    });
    doc.save("nioo-food-" + date + ".pdf");
  };

  return (
    <div className="w">
      <style>{css}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <p className="sub">Compte rendu de production et de ventes de jus</p>
        </div>
        <img src={LOGO} alt="Nioo" style={{ height: 56 }} />
      </div>

      {errors.length > 0 && (
        <div className="alert" role="alert">
          <b>⚠ Erreur : vous avez vendu plus que ce qui est disponible</b>
          <ul>{errors.map((e) => <li key={e.id}>{e.msg}</li>)}</ul>
        </div>
      )}

      <div className="card">
        <h2>Date</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card">
        <h2>Production</h2>
        <div className="sc">
          <table>
            <thead>
              <tr><th>Produit</th><th>Stock initial</th><th>Quantité produite</th><th className="r">Disponible</th><th></th></tr>
            </thead>
            <tbody>
              {prods.map((p, i) => (
                <tr key={p.id}>
                  <td><input value={p.name} onChange={(e) => upP(p.id, "name", e.target.value)} /></td>
                  <td><input type="number" min="0" value={p.stock} onChange={(e) => upP(p.id, "stock", e.target.value)} /></td>
                  <td><input type="number" min="0" value={p.qty} onChange={(e) => upP(p.id, "qty", e.target.value)} /></td>
                  <td className="r">{rows[i].avail}</td>
                  <td>
                    <button className="x" onClick={() => {
                      setProds(prods.filter((x) => x.id !== p.id));
                      setSales(sales.filter((s) => s.productId !== p.id));
                    }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button onClick={() => setProds([...prods, { id: uid(), name: "Nouveau jus", stock: 0, qty: 0 }])}>+ Ajouter un jus</button>
        </div>
      </div>

      <div className="card">
        <h2>Ventes ({sales.length})</h2>
        <div className="sc">
          <table>
            <thead>
              <tr><th>Client</th><th>Produit</th><th>Qté</th><th>Prix unit. (Ar)</th><th className="r">Total</th><th></th></tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className={badIds.has(s.productId) ? "bad" : ""}>
                  <td><input value={s.client} onChange={(e) => upS(s.id, "client", e.target.value)} /></td>
                  <td>
                    <select value={s.productId} onChange={(e) => upS(s.id, "productId", Number(e.target.value))}>
                      {prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0" value={s.qty} onChange={(e) => upS(s.id, "qty", e.target.value)} /></td>
                  <td><input type="number" min="0" value={s.price} onChange={(e) => upS(s.id, "price", e.target.value)} /></td>
                  <td className="r">{fmt(n(s.qty) * n(s.price))}</td>
                  <td><button className="x" onClick={() => setSales(sales.filter((x) => x.id !== s.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button
            disabled={prods.length === 0}
            onClick={() => setSales([...sales, { id: uid(), client: "Vente " + (sales.length + 1), productId: prods[0].id, qty: 0, price: "" }])}
          >
            + Ajouter une vente
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Résumé</h2>
        <div className="k">
          <div><b>{T.avail}</b><span>Bouteilles disponibles</span></div>
          <div><b>{T.sold}</b><span>Bouteilles vendues</span></div>
          <div><b className={T.avail - T.sold < 0 ? "neg" : ""}>{T.avail - T.sold}</b><span>Stock restant</span></div>
          <div><b>{fmt(T.rev)} Ar</b><span>Chiffre d’affaires</span></div>
        </div>
        <div className="sc" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Produit</th><th>Disponible</th><th>Vendu</th><th>Reste</th><th className="r">CA</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td><td>{r.avail}</td><td>{r.sold}</td>
                  <td className={r.left < 0 ? "neg" : ""}>{r.left}</td>
                  <td className="r">{fmt(r.rev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="p" onClick={exportPdf} disabled={errors.length > 0}>Exporter en PDF</button>
      {errors.length > 0 && <p className="sub">Corrigez les erreurs ci-dessus pour activer l’export PDF.</p>}
    </div>
  );
}

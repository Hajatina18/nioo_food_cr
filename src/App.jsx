import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");

const css = `
*{box-sizing:border-box}
body{margin:0;background:#faf7f2;color:#2a2420;font:15px/1.5 system-ui,sans-serif}
.w{max-width:760px;margin:0 auto;padding:20px 16px 40px}
h1{margin:0;font-size:24px}h2{font-size:16px;margin:0 0 10px}
.sub{color:#7a6f66;margin:2px 0 18px}
.card{background:#fff;border:1px solid #e6ddd2;border-radius:12px;padding:14px;margin-bottom:14px}
.sc{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:520px}
th{text-align:left;font-size:12px;color:#7a6f66;padding:4px 6px}
td{padding:4px 6px}
input,select{width:100%;padding:7px 8px;border:1px solid #e6ddd2;border-radius:8px;font:inherit}
button{font:inherit;border:1px solid #e6ddd2;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer}
button.p{background:#c2410c;color:#fff;border-color:#c2410c;font-weight:600}
.x{padding:4px 9px;color:#7a6f66}
.row{margin-top:10px}
.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.k div{background:#faf7f2;border-radius:10px;padding:10px}
.k b{display:block;font-size:20px}.k span{font-size:12px;color:#7a6f66}
.r{text-align:right}
`;

export default function App() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [prods, setProds] = useState([
    { name: "Fraise", qty: 26 },
    { name: "Betteraves", qty: 22 },
    { name: "Cocktail", qty: 24 },
  ]);
  const [sales, setSales] = useState(
    [1, 2, 3, 4, 5].map((i) => ({ client: "Vente " + i, product: "Fraise", qty: 1, price: "" }))
  );

  const upP = (i, k, v) => setProds(prods.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const upS = (i, k, v) => setSales(sales.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const rows = prods.map((p) => {
    const mine = sales.filter((s) => s.product === p.name);
    const sold = mine.reduce((a, s) => a + n(s.qty), 0);
    const rev = mine.reduce((a, s) => a + n(s.qty) * n(s.price), 0);
    return { name: p.name, prod: n(p.qty), sold, stock: n(p.qty) - sold, rev };
  });
  const T = {
    prod: rows.reduce((a, r) => a + r.prod, 0),
    sold: rows.reduce((a, r) => a + r.sold, 0),
    rev: rows.reduce((a, r) => a + r.rev, 0),
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Nioo Food - Compte rendu", 14, 18);
    doc.setFontSize(11);
    doc.text("Date : " + date, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Produit", "Produit (qte)", "Vendu", "Stock restant", "CA (Ar)"]],
      body: rows.map((r) => [r.name, r.prod, r.sold, r.stock, fmt(r.rev)]),
      foot: [["Total", T.prod, T.sold, T.prod - T.sold, fmt(T.rev)]],
      headStyles: { fillColor: [194, 65, 12] },
      footStyles: { fillColor: [240, 230, 220], textColor: 20 },
    });
    const y = doc.lastAutoTable.finalY;
    doc.setFontSize(13);
    doc.text("Detail des ventes (" + sales.length + ")", 14, y + 12);
    autoTable(doc, {
      startY: y + 16,
      head: [["#", "Client", "Produit", "Qte", "Prix unit.", "Total"]],
      body: sales.map((s, i) => [i + 1, s.client, s.product, n(s.qty), fmt(n(s.price)), fmt(n(s.qty) * n(s.price))]),
      headStyles: { fillColor: [194, 65, 12] },
    });
    doc.save("nioo-food-" + date + ".pdf");
  };

  return (
    <div className="w">
      <style>{css}</style>
      <h1>Nioo Food</h1>
      <p className="sub">Compte rendu de production et de ventes de jus</p>

      <div className="card">
        <h2>Date</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card">
        <h2>Production</h2>
        <div className="sc">
          <table>
            <thead><tr><th>Produit</th><th>Quantité produite</th><th></th></tr></thead>
            <tbody>
              {prods.map((p, i) => (
                <tr key={i}>
                  <td><input value={p.name} onChange={(e) => upP(i, "name", e.target.value)} /></td>
                  <td><input type="number" min="0" value={p.qty} onChange={(e) => upP(i, "qty", e.target.value)} /></td>
                  <td><button className="x" onClick={() => setProds(prods.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button onClick={() => setProds([...prods, { name: "Nouveau jus", qty: 0 }])}>+ Ajouter un jus</button>
        </div>
      </div>

      <div className="card">
        <h2>Ventes ({sales.length})</h2>
        <div className="sc">
          <table>
            <thead><tr><th>Client</th><th>Produit</th><th>Qté</th><th>Prix unit. (Ar)</th><th className="r">Total</th><th></th></tr></thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={i}>
                  <td><input value={s.client} onChange={(e) => upS(i, "client", e.target.value)} /></td>
                  <td>
                    <select value={s.product} onChange={(e) => upS(i, "product", e.target.value)}>
                      {prods.map((p, j) => <option key={j}>{p.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0" value={s.qty} onChange={(e) => upS(i, "qty", e.target.value)} /></td>
                  <td><input type="number" min="0" value={s.price} onChange={(e) => upS(i, "price", e.target.value)} /></td>
                  <td className="r">{fmt(n(s.qty) * n(s.price))}</td>
                  <td><button className="x" onClick={() => setSales(sales.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button onClick={() => setSales([...sales, { client: "Vente " + (sales.length + 1), product: prods[0]?.name || "", qty: 1, price: "" }])}>
            + Ajouter une vente
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Résumé</h2>
        <div className="k">
          <div><b>{T.prod}</b><span>Bouteilles produites</span></div>
          <div><b>{T.sold}</b><span>Bouteilles vendues</span></div>
          <div><b>{T.prod - T.sold}</b><span>Stock restant</span></div>
          <div><b>{fmt(T.rev)} Ar</b><span>Chiffre d’affaires</span></div>
        </div>
        <div className="sc" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Produit</th><th>Produit</th><th>Vendu</th><th>Stock</th><th className="r">CA</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}><td>{r.name}</td><td>{r.prod}</td><td>{r.sold}</td><td>{r.stock}</td><td className="r">{fmt(r.rev)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="p" onClick={exportPdf}>Exporter en PDF</button>
    </div>
  );
}

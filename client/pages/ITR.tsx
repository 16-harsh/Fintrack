import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { isFirebaseConfigured, getDb, getFirebaseAuth } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

interface IncomeEntry { id?: string; uid?: string; source: string; amount: number; date: string; notes?: string; invoiceUrl?: string; }
interface ExpenseEntry { id?: string; uid?: string; category: string; amount: number; date: string; notes?: string; receiptUrl?: string; }

const demoIncome: IncomeEntry[] = [
  { source: "Job", amount: 2500, date: new Date().toISOString().slice(0,10), notes: "Salary", invoiceUrl: "" },
  { source: "Freelancing", amount: 900, date: new Date(Date.now()-86400000*20).toISOString().slice(0,10), notes: "Landing page", invoiceUrl: "" },
];
const demoExpenses: ExpenseEntry[] = [
  { category: "Housing", amount: 900, date: new Date().toISOString().slice(0,10), notes: "Rent", receiptUrl: "" },
  { category: "Food", amount: 220, date: new Date(Date.now()-86400000*10).toISOString().slice(0,10), notes: "Groceries", receiptUrl: "" },
];

export default function ITR() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const auth = configured ? getFirebaseAuth() : null;

  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [incomes, setIncomes] = useState<IncomeEntry[]>(configured ? [] : demoIncome);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(configured ? [] : demoExpenses);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const user = auth!.currentUser; if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const db = getDb();
        const qi = query(collection(db, "incomes"), where("uid","==", user.uid), orderBy("createdAt","desc"));
        const qe = query(collection(db, "expenses"), where("uid","==", user.uid), orderBy("createdAt","desc"));
        const [si, se] = await Promise.all([getDocs(qi), getDocs(qe)]);
        const iList: IncomeEntry[] = []; si.forEach(d => iList.push({ id: d.id, ...(d.data() as any) }));
        const eList: ExpenseEntry[] = []; se.forEach(d => eList.push({ id: d.id, ...(d.data() as any) }));
        setIncomes(iList);
        setExpenses(eList);
      } finally {
        setLoading(false);
      }
    })();
  }, [configured, auth]);

  const rangeIncomes = useMemo(() => incomes.filter(i => i.date >= from && i.date <= to), [incomes, from, to]);
  const rangeExpenses = useMemo(() => expenses.filter(e => e.date >= from && e.date <= to), [expenses, from, to]);

  const totals = useMemo(() => ({
    income: rangeIncomes.reduce((s, r) => s + (Number(r.amount)||0), 0),
    expenses: rangeExpenses.reduce((s, r) => s + (Number(r.amount)||0), 0),
  }), [rangeIncomes, rangeExpenses]);

  function exportITR() {
    const incomeSheet = XLSX.utils.json_to_sheet(
      rangeIncomes.map(r => ({ Date: r.date, Source: r.source, Amount: r.amount, InvoiceURL: r.invoiceUrl || "" })),
    );
    const expenseSheet = XLSX.utils.json_to_sheet(
      rangeExpenses.map(r => ({ Date: r.date, Category: r.category, Amount: r.amount, ReceiptURL: r.receiptUrl || "" })),
    );
    const summary = [
      { Metric: "Total Income", Value: totals.income },
      { Metric: "Total Expenses", Value: totals.expenses },
      { Metric: "Savings", Value: totals.income - totals.expenses },
      { Metric: "Period", Value: `${from} to ${to}` },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, incomeSheet, "Income");
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");
    XLSX.utils.book_append_sheet(wb, summarySheet, "ITR Summary");
    XLSX.writeFile(wb, `fintrack-itr-${from}-to-${to}.xlsx`);
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">ITR Report</h1>
              <p className="text-foreground/70">Generate ITR-ready Excel with income, expenses and links to documents.</p>
              {!configured && <p className="text-sm text-foreground/70 mt-1">Demo mode active. Connect Firebase to use your data.</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" className="h-10 rounded-md border bg-background px-3 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
              <span className="text-sm">to</span>
              <input type="date" className="h-10 rounded-md border bg-background px-3 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
              <Button onClick={exportITR} disabled={loading}>Export ITR Excel</Button>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            <Card title="Total Income" value={`₹${totals.income.toLocaleString()}`} />
            <Card title="Total Expenses" value={`₹${totals.expenses.toLocaleString()}`} />
            <Card title="Savings" value={`₹${(totals.income - totals.expenses).toLocaleString()}`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">Income ({rangeIncomes.length})</h3>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/50 text-left"><tr><th className="p-2">Date</th><th className="p-2">Source</th><th className="p-2">Amount</th><th className="p-2">Invoice</th></tr></thead>
                  <tbody>
                    {rangeIncomes.map((r, i) => (
                      <tr key={r.id || i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{r.date}</td>
                        <td className="p-2">{r.source}</td>
                        <td className="p-2">₹{Number(r.amount).toLocaleString()}</td>
                        <td className="p-2">{r.invoiceUrl ? <a className="text-primary underline" href={r.invoiceUrl} target="_blank" rel="noreferrer">Link</a> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">Expenses ({rangeExpenses.length})</h3>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/50 text-left"><tr><th className="p-2">Date</th><th className="p-2">Category</th><th className="p-2">Amount</th><th className="p-2">Receipt</th></tr></thead>
                  <tbody>
                    {rangeExpenses.map((r, i) => (
                      <tr key={r.id || i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{r.date}</td>
                        <td className="p-2">{r.category}</td>
                        <td className="p-2">₹{Number(r.amount).toLocaleString()}</td>
                        <td className="p-2">{r.receiptUrl ? <a className="text-primary underline" href={r.receiptUrl} target="_blank" rel="noreferrer">Link</a> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-foreground/70">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

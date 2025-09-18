import { Layout } from "@/components/layout/Layout";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { isFirebaseConfigured, getDb, getFirebaseAuth } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

type IncomeRow = { id?: string; amount: number; date: string; source: string };
type ExpenseRow = { id?: string; amount: number; date: string; category: string };

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#60a5fa", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const auth = configured ? getFirebaseAuth() : null;
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<number>(0);

  useEffect(() => {
    if (!configured) return;
    const user = auth!.currentUser; if (!user) return;
    (async () => {
      const db = getDb();
      const qi = query(collection(db, "incomes"), where("uid","==", user.uid), orderBy("createdAt","desc"));
      const qe = query(collection(db, "expenses"), where("uid","==", user.uid), orderBy("createdAt","desc"));
      const qr = query(collection(db, "reminders"), where("uid","==", user.uid), orderBy("dueDate","asc"));
      const [si, se, sr] = await Promise.all([getDocs(qi), getDocs(qe), getDocs(qr)]);
      const iList: IncomeRow[] = []; si.forEach(d => { const x:any = d.data(); iList.push({ id:d.id, amount:Number(x.amount)||0, date:x.date, source:x.source }); });
      const eList: ExpenseRow[] = []; se.forEach(d => { const x:any = d.data(); eList.push({ id:d.id, amount:Number(x.amount)||0, date:x.date, category:x.category }); });
      setIncomes(iList);
      setExpenses(eList);
      let upcoming = 0; sr.forEach(d => { const x:any = d.data(); if (x.status === 'upcoming') upcoming++; });
      setUpcomingReminders(upcoming);
    })();
  }, [configured, auth]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { income:number; expenses:number }>();
    const monthKey = (iso:string) => (iso?.slice(0,7) || "");
    for (const r of incomes) {
      const k = monthKey(r.date); if (!k) continue; const v = map.get(k) || { income:0, expenses:0 }; v.income += Number(r.amount)||0; map.set(k, v);
    }
    for (const r of expenses) {
      const k = monthKey(r.date); if (!k) continue; const v = map.get(k) || { income:0, expenses:0 }; v.expenses += Number(r.amount)||0; map.set(k, v);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map(k => ({ month: k, income: map.get(k)!.income, expenses: map.get(k)!.expenses }));
  }, [incomes, expenses]);

  const catData = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) { m.set(e.category || "Other", (m.get(e.category || "Other")||0) + (Number(e.amount)||0)); }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const totals = useMemo(() => {
    const ti = incomes.reduce((s, r) => s + (Number(r.amount)||0), 0);
    const te = expenses.reduce((s, r) => s + (Number(r.amount)||0), 0);
    return { ti, te, saving: ti - te };
  }, [incomes, expenses]);

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-foreground/70">Overview of your finances with charts and KPIs.</p>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Total Income" value={`₹${totals.ti.toLocaleString()}`} />
            <KPI title="Total Expenses" value={`₹${totals.te.toLocaleString()}`} />
            <KPI title="Savings" value={`₹${totals.saving.toLocaleString()}`} />
            <KPI title="Reminders" value={`${upcomingReminders} upcoming`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground/70">Income vs Expenses</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="currentColor" />
                    <YAxis stroke="currentColor" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground/70">Expenses by Category</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie dataKey="value" nameKey="name" data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-foreground/70">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

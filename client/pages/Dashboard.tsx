import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
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
import * as XLSX from "xlsx";

const demoIncome = [
  { month: "Jan", income: 1800 },
  { month: "Feb", income: 2200 },
  { month: "Mar", income: 2100 },
  { month: "Apr", income: 2500 },
  { month: "May", income: 2400 },
  { month: "Jun", income: 2600 },
];
const demoExpenses = [
  { month: "Jan", expenses: 1200 },
  { month: "Feb", expenses: 1300 },
  { month: "Mar", expenses: 1600 },
  { month: "Apr", expenses: 1700 },
  { month: "May", expenses: 1500 },
  { month: "Jun", expenses: 1650 },
];
const categories = [
  { name: "Housing", value: 650 },
  { name: "Food", value: 380 },
  { name: "Transport", value: 210 },
  { name: "Shopping", value: 260 },
  { name: "Health", value: 150 },
  { name: "Other", value: 120 },
];
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#60a5fa", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const merged = useMemo(() =>
    demoIncome.map((d, i) => ({ month: d.month, income: d.income, expenses: demoExpenses[i].expenses })),
  []);
  const totals = useMemo(() => {
    const ti = merged.reduce((s, r) => s + r.income, 0);
    const te = merged.reduce((s, r) => s + r.expenses, 0);
    return { ti, te, saving: ti - te };
  }, [merged]);

  const [exportMode, setExportMode] = useState<"ITR" | "GST">("ITR");

  function exportExcel() {
    const incomeSheet = XLSX.utils.json_to_sheet(
      demoIncome.map((d) => ({ Month: d.month, Source: "Job/Freelance", Amount: d.income })),
    );
    const expenseSheet = XLSX.utils.json_to_sheet(
      categories.map((c) => ({ Category: c.name, Amount: c.value })),
    );
    const monthlySheet = XLSX.utils.json_to_sheet(
      merged.map((r) => ({ Month: r.month, Income: r.income, Expenses: r.expenses, Net: r.income - r.expenses })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, incomeSheet, "Income");
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");
    XLSX.utils.book_append_sheet(wb, monthlySheet, exportMode === "GST" ? "GST Summary" : "ITR Summary");
    XLSX.writeFile(wb, `fintrack-${exportMode.toLowerCase()}-report.xlsx`);
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-foreground/70">Overview of your finances with charts and KPIs.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as any)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="ITR">ITR</option>
                <option value="GST">GST</option>
              </select>
              <Button onClick={exportExcel}>Export Excel</Button>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Total Income" value={`₹${totals.ti.toLocaleString()}`} />
            <KPI title="Total Expenses" value={`₹${totals.te.toLocaleString()}`} />
            <KPI title="Savings" value={`₹${totals.saving.toLocaleString()}`} />
            <KPI title="Reminders" value={"2 upcoming"} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground/70">Income vs Expenses</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={merged}>
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
                    <Pie dataKey="value" nameKey="name" data={categories} cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {categories.map((_, i) => (
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

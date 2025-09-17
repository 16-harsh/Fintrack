import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  isFirebaseConfigured,
  getDb,
  getBucket,
  getFirebaseAuth,
} from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useMemo, useState } from "react";

interface ExpenseEntry {
  id?: string;
  uid?: string;
  category: string;
  amount: number;
  date: string; // ISO
  notes?: string;
  receiptUrl?: string;
  createdAt?: any;
}

const demo: ExpenseEntry[] = [
  {
    category: "Housing",
    amount: 900,
    date: new Date().toISOString().slice(0, 10),
    notes: "Rent",
  },
  {
    category: "Food",
    amount: 250,
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    notes: "Groceries",
  },
];

export default function Expenses() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const auth = configured ? getFirebaseAuth() : null;
  const [items, setItems] = useState<ExpenseEntry[]>(configured ? [] : demo);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<ExpenseEntry>({
    category: "Housing",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<ExpenseEntry | null>(null);
  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [items],
  );

  useEffect(() => {
    if (!configured) return;
    const user = auth!.currentUser;
    if (!user) return;
    (async () => {
      const db = getDb();
      const q = query(
        collection(db, "expenses"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const list: ExpenseEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setItems(list);
    })();
  }, [configured, auth]);

  async function onAdd() {
    if (!form.amount || !form.date) return;
    if (!configured) {
      setItems((prev) => [{ ...form }, ...prev]);
      setForm({
        category: form.category,
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setFile(null);
      return;
    }
    const user = auth!.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const docRef = await addDoc(collection(db, "expenses"), {
        uid: user.uid,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes ?? "",
        receiptUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      let receiptUrl = "";
      if (file) {
        const storage = getBucket();
        const path = `receipts/${user.uid}/${docRef.id}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        receiptUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "expenses", docRef.id), {
          receiptUrl,
          updatedAt: serverTimestamp(),
        });
      }
      setItems((prev) => [
        {
          id: docRef.id,
          uid: user.uid,
          category: form.category,
          amount: Number(form.amount),
          date: form.date,
          notes: form.notes,
          receiptUrl,
        },
        ...prev,
      ]);
      setForm({
        category: form.category,
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  async function onStartEdit(i: ExpenseEntry, idx: number) {
    const id = i.id ?? idx;
    setEditingId(id);
    setEditForm({ ...i });
  }

  async function onCancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function onSaveEdit(idx: number) {
    if (!editForm) return;
    const id = editForm.id;
    if (!configured) {
      setItems((prev) =>
        prev.map((it, i) =>
          (it.id ?? i) === (editingId as any) ? { ...it, ...editForm } : it,
        ),
      );
      setEditingId(null);
      setEditForm(null);
      return;
    }
    const user = auth!.currentUser;
    if (!user || !id) {
      setEditingId(null);
      setEditForm(null);
      return;
    }
    const db = getDb();
    await updateDoc(doc(db, "expenses", id), {
      category: editForm.category,
      amount: Number(editForm.amount),
      date: editForm.date,
      notes: editForm.notes || "",
      updatedAt: serverTimestamp(),
    });
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...editForm } : it)),
    );
    setEditingId(null);
    setEditForm(null);
  }

  async function onDelete(i: ExpenseEntry, idx: number) {
    if (!confirm("Delete this expense entry?")) return;
    if (!configured) {
      setItems((prev) =>
        prev.filter((it, i2) => (it.id ?? i2) !== (i.id ?? idx)),
      );
      return;
    }
    const user = auth!.currentUser;
    if (!user || !i.id) return;
    const db = getDb();
    await deleteDoc(doc(db, "expenses", i.id));
    setItems((prev) => prev.filter((it) => it.id !== i.id));
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-foreground/70">
              Record expenses by category and upload receipts.
            </p>
            {!configured && (
              <p className="mt-2 text-sm text-foreground/70">
                Demo mode active. Connect Firebase to persist data.
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Category</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  list="expense-categories"
                  placeholder="e.g. Housing, Food, Transport"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
                <datalist id="expense-categories">
                  <option value="Housing" />
                  <option value="Food" />
                  <option value="Transport" />
                  <option value="Shopping" />
                  <option value="Health" />
                  <option value="Other" />
                </datalist>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Amount</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Date</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="grid gap-1 lg:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  placeholder="Optional"
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="grid gap-1 lg:col-span-2">
                <label className="text-sm font-medium">Receipt</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-2"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={onAdd} disabled={loading}>
                  {loading ? "Saving..." : "Add Expense"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Entries</h2>
            <p className="text-sm text-foreground/70">
              Total: ₹{total.toLocaleString()}
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3">Receipt</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => {
                  const rowId = i.id ?? idx;
                  const isEditing = editingId === rowId;
                  return (
                    <tr key={rowId} className="border-t">
                      <td className="p-3 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            className="h-9 w-full rounded border bg-background px-2 text-sm"
                            type="date"
                            value={editForm?.date || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...(f as any),
                                date: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          i.date
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="h-9 w-full rounded border bg-background px-2 text-sm"
                            list="expense-categories"
                            value={editForm?.category || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...(f as any),
                                category: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          i.category
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="h-9 w-full rounded border bg-background px-2 text-sm"
                            type="number"
                            value={Number(editForm?.amount) || 0}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...(f as any),
                                amount: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          `₹${Number(i.amount).toLocaleString()}`
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="h-9 w-full rounded border bg-background px-2 text-sm"
                            value={editForm?.notes || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...(f as any),
                                notes: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          i.notes
                        )}
                      </td>
                      <td className="p-3">
                        {i.receiptUrl ? (
                          <a
                            className="text-primary underline"
                            href={i.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onSaveEdit(idx)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={onCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onStartEdit(i, idx)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(i, idx)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

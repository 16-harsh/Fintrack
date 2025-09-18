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

interface IncomeEntry {
  id?: string;
  uid?: string;
  source: string;
  amount: number;
  date: string; // ISO
  notes?: string;
  invoiceUrl?: string;
  createdAt?: any;
}


export default function Income() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const auth = configured ? getFirebaseAuth() : null;
  const [items, setItems] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<IncomeEntry>({
    source: "Job",
    amount: Number.NaN,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<IncomeEntry | null>(null);
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
        collection(db, "incomes"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const list: IncomeEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setItems(list);
    })();
  }, [configured, auth]);

  async function onAdd() {
    if (!form.amount || !form.date) return;
    if (!configured) { alert("Connect Firebase to add income."); return; }
    const user = auth!.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const docRef = await addDoc(collection(db, "incomes"), {
        uid: user.uid,
        source: form.source,
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes ?? "",
        invoiceUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      let invoiceUrl = "";
      if (file) {
        const storage = getBucket();
        const path = `invoices/${user.uid}/${docRef.id}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        invoiceUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "incomes", docRef.id), {
          invoiceUrl,
          updatedAt: serverTimestamp(),
        });
      }
      setItems((prev) => [
        {
          id: docRef.id,
          uid: user.uid,
          source: form.source,
          amount: Number(form.amount),
          date: form.date,
          notes: form.notes,
          invoiceUrl,
        },
        ...prev,
      ]);
      setForm({
        source: form.source,
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  async function onStartEdit(i: IncomeEntry, idx: number) {
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
    if (!configured) { alert("Connect Firebase to edit income."); return; }
    const user = auth!.currentUser;
    if (!user || !id) {
      setEditingId(null);
      setEditForm(null);
      return;
    }
    const db = getDb();
    await updateDoc(doc(db, "incomes", id), {
      source: editForm.source,
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

  async function onDelete(i: IncomeEntry, idx: number) {
    if (!confirm("Delete this income entry?")) return;
    if (!configured) { alert("Connect Firebase to delete income."); return; }
    const user = auth!.currentUser;
    if (!user || !i.id) return;
    const db = getDb();
    await deleteDoc(doc(db, "incomes", i.id));
    setItems((prev) => prev.filter((it) => it.id !== i.id));
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Income</h1>
            <p className="text-foreground/70">
              Upload income sources and invoices.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Source</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  list="income-sources"
                  placeholder="e.g. Job, Freelancing, Trading"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
                <datalist id="income-sources">
                  <option value="Job" />
                  <option value="Freelancing" />
                  <option value="Trading" />
                  <option value="Other" />
                </datalist>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Amount</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  type="number"
                  min={0}
                  value={Number.isFinite(form.amount) ? form.amount : ""}
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
                <label className="text-sm font-medium">Invoice</label>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-2"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={onAdd} disabled={loading}>
                  {loading ? "Saving..." : "Add Income"}
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
                  <th className="p-3">Source</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3">Invoice</th>
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
                            value={editForm?.source || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...(f as any),
                                source: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          i.source
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
                        {i.invoiceUrl ? (
                          <a
                            className="text-primary underline"
                            href={i.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        ) : (
                          "��"
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

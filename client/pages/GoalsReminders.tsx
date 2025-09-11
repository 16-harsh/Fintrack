import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { isFirebaseConfigured, getDb, getFirebaseAuth } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

interface SavingEntry {
  id?: string;
  uid?: string;
  goalName: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface ReminderEntry {
  id?: string;
  uid?: string;
  title: string;
  dueDate: string; // ISO
  amount?: number;
  recurring: 'none' | 'monthly' | 'yearly';
  status: 'upcoming' | 'paid' | 'snoozed';
  createdAt?: any;
  updatedAt?: any;
}

const demoSavings: SavingEntry[] = [
  { goalName: 'Emergency Fund', category: 'Safety', targetAmount: 200000, currentAmount: 65000, notes: '6 months runway' },
  { goalName: 'New Laptop', category: 'Gear', targetAmount: 120000, currentAmount: 30000 },
];

const demoReminders: ReminderEntry[] = [
  { title: 'Credit Card Bill', dueDate: new Date(Date.now()+86400000*5).toISOString().slice(0,10), amount: 4500, recurring: 'monthly', status: 'upcoming' },
  { title: 'Internet Bill', dueDate: new Date(Date.now()+86400000*10).toISOString().slice(0,10), amount: 799, recurring: 'monthly', status: 'upcoming' },
];

export default function GoalsReminders() {
  const configured = useMemo(() => isFirebaseConfigured, []);
  const auth = configured ? getFirebaseAuth() : null;

  const [savings, setSavings] = useState<SavingEntry[]>(configured ? [] : demoSavings);
  const [reminders, setReminders] = useState<ReminderEntry[]>(configured ? [] : demoReminders);

  const [savingForm, setSavingForm] = useState<SavingEntry>({ goalName: '', category: 'General', targetAmount: 0, currentAmount: 0, notes: '' });
  const [reminderForm, setReminderForm] = useState<ReminderEntry>({ title: '', dueDate: new Date().toISOString().slice(0,10), amount: 0, recurring: 'none', status: 'upcoming' });

  useEffect(() => {
    if (!configured) return;
    const user = auth!.currentUser;
    if (!user) return;
    (async () => {
      const db = getDb();
      const q1 = query(collection(db, 'savings'), where('uid','==', user.uid), orderBy('createdAt','desc'));
      const q2 = query(collection(db, 'reminders'), where('uid','==', user.uid), orderBy('dueDate','asc'));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const sList: SavingEntry[] = []; s1.forEach(d => sList.push({ id: d.id, ...(d.data() as any) }));
      const rList: ReminderEntry[] = []; s2.forEach(d => rList.push({ id: d.id, ...(d.data() as any) }));
      setSavings(sList); setReminders(rList);
    })();
  }, [configured, auth]);

  async function addSaving() {
    if (!savingForm.goalName || !savingForm.targetAmount) return;
    if (!configured) {
      setSavings(prev => [{ ...savingForm }, ...prev]);
      setSavingForm({ goalName: '', category: 'General', targetAmount: 0, currentAmount: 0, notes: '' });
      return;
    }
    const user = auth!.currentUser; if (!user) return;
    const db = getDb();
    const ref = await addDoc(collection(db, 'savings'), {
      uid: user.uid,
      goalName: savingForm.goalName,
      category: savingForm.category,
      targetAmount: Number(savingForm.targetAmount),
      currentAmount: Number(savingForm.currentAmount||0),
      notes: savingForm.notes||'',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSavings(prev => [{ id: ref.id, uid: user.uid, ...savingForm }, ...prev]);
    setSavingForm({ goalName: '', category: 'General', targetAmount: 0, currentAmount: 0, notes: '' });
  }

  async function addReminder() {
    if (!reminderForm.title || !reminderForm.dueDate) return;
    if (!configured) {
      setReminders(prev => [{ ...reminderForm }, ...prev]);
      setReminderForm({ title: '', dueDate: new Date().toISOString().slice(0,10), amount: 0, recurring: 'none', status: 'upcoming' });
      return;
    }
    const user = auth!.currentUser; if (!user) return;
    const db = getDb();
    const ref = await addDoc(collection(db, 'reminders'), {
      uid: user.uid,
      title: reminderForm.title,
      dueDate: reminderForm.dueDate,
      amount: Number(reminderForm.amount||0),
      recurring: reminderForm.recurring,
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setReminders(prev => [{ id: ref.id, uid: user.uid, ...reminderForm, status: 'upcoming' }, ...prev]);
    setReminderForm({ title: '', dueDate: new Date().toISOString().slice(0,10), amount: 0, recurring: 'none', status: 'upcoming' });
  }

  async function markPaid(r: ReminderEntry) {
    if (!configured) {
      setReminders(prev => prev.map(x => x === r ? { ...x, status: 'paid' } : x));
      return;
    }
    const user = auth!.currentUser; if (!user || !r.id) return;
    const db = getDb();
    await updateDoc(doc(db, 'reminders', r.id), { status: 'paid', updatedAt: serverTimestamp() });
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, status: 'paid' } : x));
  }

  async function snooze(r: ReminderEntry) {
    const newDate = new Date(r.dueDate);
    newDate.setDate(newDate.getDate()+7);
    const iso = newDate.toISOString().slice(0,10);
    if (!configured) {
      setReminders(prev => prev.map(x => x === r ? { ...x, status: 'snoozed', dueDate: iso } : x));
      return;
    }
    const user = auth!.currentUser; if (!user || !r.id) return;
    const db = getDb();
    await updateDoc(doc(db, 'reminders', r.id), { status: 'snoozed', dueDate: iso, updatedAt: serverTimestamp() });
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, status: 'snoozed', dueDate: iso } : x));
  }

  const upcomingCount = useMemo(() => reminders.filter(r => r.status === 'upcoming').length, [reminders]);
  const progress = (v: number, t: number) => !t ? 0 : Math.min(100, Math.round((v/t)*100));

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goals & Reminders</h1>
            <p className="text-foreground/70">Plan savings goals and never miss a bill.</p>
            {!configured && (
              <p className="mt-2 text-sm text-foreground/70">Demo mode active. Connect Firebase to persist data.</p>
            )}
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Add Goal</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Goal Name</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" value={savingForm.goalName} onChange={e=>setSavingForm({...savingForm, goalName: e.target.value})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Category</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" value={savingForm.category} onChange={e=>setSavingForm({...savingForm, category: e.target.value})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Target Amount</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min={0} value={savingForm.targetAmount} onChange={e=>setSavingForm({...savingForm, targetAmount: Number(e.target.value)})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Current Amount</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min={0} value={savingForm.currentAmount} onChange={e=>setSavingForm({...savingForm, currentAmount: Number(e.target.value)})} />
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Optional" value={savingForm.notes||''} onChange={e=>setSavingForm({...savingForm, notes: e.target.value})} />
                </div>
                <div>
                  <Button onClick={addSaving}>Add Goal</Button>
                </div>
              </div>

              <h3 className="mt-8 text-sm font-semibold text-foreground/70">Your Goals</h3>
              <div className="mt-3 grid gap-3">
                {savings.map((s, idx) => (
                  <div key={s.id || idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.goalName}</p>
                        <p className="text-xs text-foreground/70">{s.category}</p>
                      </div>
                      <p className="text-sm">₹{Number(s.currentAmount||0).toLocaleString()} / ₹{Number(s.targetAmount||0).toLocaleString()}</p>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-secondary">
                      <div className="h-full bg-primary" style={{ width: `${progress(Number(s.currentAmount||0), Number(s.targetAmount||0))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Add Reminder</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 sm:col-span-2">
                  <label className="text-sm font-medium">Title</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" value={reminderForm.title} onChange={e=>setReminderForm({...reminderForm, title: e.target.value})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Due Date</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={reminderForm.dueDate} onChange={e=>setReminderForm({...reminderForm, dueDate: e.target.value})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Amount</label>
                  <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min={0} value={Number(reminderForm.amount)||0} onChange={e=>setReminderForm({...reminderForm, amount: Number(e.target.value)})} />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Recurring</label>
                  <select className="h-10 rounded-md border bg-background px-3 text-sm" value={reminderForm.recurring} onChange={e=>setReminderForm({...reminderForm, recurring: e.target.value as any})}>
                    <option value="none">None</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <Button onClick={addReminder}>Add Reminder</Button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground/70">Upcoming</h3>
                <p className="text-xs text-foreground/70">{upcomingCount} upcoming</p>
              </div>
              <div className="mt-3 grid gap-3">
                {reminders.map((r, idx) => (
                  <div key={r.id || idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-foreground/70">Due {r.dueDate} · {r.recurring !== 'none' ? r.recurring : 'one-time'} · {r.status}</p>
                      </div>
                      <p className="text-sm">₹{Number(r.amount||0).toLocaleString()}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => markPaid(r)}>Mark Paid</Button>
                      <Button size="sm" onClick={() => snooze(r)}>Snooze 7d</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { isFirebaseConfigured, getDb, getFirebaseAuth } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, deleteDoc } from "firebase/firestore";
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
  const [editingGoalId, setEditingGoalId] = useState<string | number | null>(null);
  const [editGoalForm, setEditGoalForm] = useState<SavingEntry | null>(null);
  const [reminders, setReminders] = useState<ReminderEntry[]>(configured ? [] : demoReminders);
  const [editingReminderId, setEditingReminderId] = useState<string | number | null>(null);
  const [editReminderForm, setEditReminderForm] = useState<ReminderEntry | null>(null);

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

  async function startEditGoal(s: SavingEntry, idx: number) {
    setEditingGoalId(s.id ?? idx);
    setEditGoalForm({ ...s });
  }
  function cancelEditGoal() { setEditingGoalId(null); setEditGoalForm(null); }
  async function saveEditGoal(idx: number) {
    if (!editGoalForm) return;
    if (!configured) {
      setSavings(prev => prev.map((x, i) => ((x.id ?? i) === (editingGoalId as any) ? { ...x, ...editGoalForm } : x)));
      setEditingGoalId(null); setEditGoalForm(null); return;
    }
    const user = auth!.currentUser; if (!user || !editGoalForm.id) { setEditingGoalId(null); setEditGoalForm(null); return; }
    const db = getDb();
    await updateDoc(doc(db, 'savings', editGoalForm.id), {
      goalName: editGoalForm.goalName,
      category: editGoalForm.category,
      targetAmount: Number(editGoalForm.targetAmount||0),
      currentAmount: Number(editGoalForm.currentAmount||0),
      notes: editGoalForm.notes||'',
      updatedAt: serverTimestamp(),
    });
    setSavings(prev => prev.map(x => x.id === editGoalForm.id ? { ...x, ...editGoalForm } : x));
    setEditingGoalId(null); setEditGoalForm(null);
  }
  async function deleteGoal(s: SavingEntry, idx: number) {
    if (!confirm('Delete this goal?')) return;
    if (!configured) { setSavings(prev => prev.filter((x, i)=> (x.id ?? i)!==(s.id ?? idx))); return; }
    const user = auth!.currentUser; if (!user || !s.id) return;
    const db = getDb(); await deleteDoc(doc(db, 'savings', s.id));
    setSavings(prev => prev.filter(x => x.id !== s.id));
  }

  async function startEditReminder(r: ReminderEntry, idx: number) {
    setEditingReminderId(r.id ?? idx);
    setEditReminderForm({ ...r });
  }
  function cancelEditReminder() { setEditingReminderId(null); setEditReminderForm(null); }
  async function saveEditReminder(idx: number) {
    if (!editReminderForm) return;
    if (!configured) {
      setReminders(prev => prev.map((x, i) => ((x.id ?? i) === (editingReminderId as any) ? { ...x, ...editReminderForm } : x)));
      setEditingReminderId(null); setEditReminderForm(null); return;
    }
    const user = auth!.currentUser; if (!user || !editReminderForm.id) { setEditingReminderId(null); setEditReminderForm(null); return; }
    const db = getDb();
    await updateDoc(doc(db, 'reminders', editReminderForm.id), {
      title: editReminderForm.title,
      dueDate: editReminderForm.dueDate,
      amount: Number(editReminderForm.amount||0),
      recurring: editReminderForm.recurring,
      status: editReminderForm.status,
      updatedAt: serverTimestamp(),
    });
    setReminders(prev => prev.map(x => x.id === editReminderForm.id ? { ...x, ...editReminderForm } : x));
    setEditingReminderId(null); setEditReminderForm(null);
  }
  async function deleteReminder(r: ReminderEntry, idx: number) {
    if (!confirm('Delete this reminder?')) return;
    if (!configured) { setReminders(prev => prev.filter((x, i)=> (x.id ?? i)!==(r.id ?? idx))); return; }
    const user = auth!.currentUser; if (!user || !r.id) return;
    const db = getDb(); await deleteDoc(doc(db, 'reminders', r.id));
    setReminders(prev => prev.filter(x => x.id !== r.id));
  }

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
                {savings.map((s, idx) => {
                  const rowId = s.id ?? idx;
                  const isEditing = editingGoalId === rowId;
                  return (
                    <div key={rowId} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" value={editGoalForm?.goalName||''} onChange={e=>setEditGoalForm(f=>({...(f as any), goalName: e.target.value}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" value={editGoalForm?.category||''} onChange={e=>setEditGoalForm(f=>({...(f as any), category: e.target.value}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" type="number" value={Number(editGoalForm?.targetAmount)||0} onChange={e=>setEditGoalForm(f=>({...(f as any), targetAmount: Number(e.target.value)}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" type="number" value={Number(editGoalForm?.currentAmount)||0} onChange={e=>setEditGoalForm(f=>({...(f as any), currentAmount: Number(e.target.value)}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2" placeholder="Notes" value={editGoalForm?.notes||''} onChange={e=>setEditGoalForm(f=>({...(f as any), notes: e.target.value}))} />
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">{s.goalName}</p>
                              <p className="text-xs text-foreground/70">{s.category}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">₹{Number((isEditing ? editGoalForm?.currentAmount : s.currentAmount) || 0).toLocaleString()} / ₹{Number((isEditing ? editGoalForm?.targetAmount : s.targetAmount) || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-secondary">
                        <div className="h-full bg-primary" style={{ width: `${progress(Number((isEditing ? editGoalForm?.currentAmount : s.currentAmount) || 0), Number((isEditing ? editGoalForm?.targetAmount : s.targetAmount) || 0))}%` }} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={()=>saveEditGoal(idx)}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditGoal}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={()=>startEditGoal(s, idx)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={()=>deleteGoal(s, idx)}>Delete</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                {reminders.map((r, idx) => {
                  const rowId = r.id ?? idx;
                  const isEditing = editingReminderId === rowId;
                  return (
                    <div key={rowId} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-2" value={editReminderForm?.title||''} onChange={e=>setEditReminderForm(f=>({...(f as any), title: e.target.value}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" type="date" value={editReminderForm?.dueDate||''} onChange={e=>setEditReminderForm(f=>({...(f as any), dueDate: e.target.value}))} />
                              <input className="h-9 rounded-md border bg-background px-2 text-sm" type="number" value={Number(editReminderForm?.amount)||0} onChange={e=>setEditReminderForm(f=>({...(f as any), amount: Number(e.target.value)}))} />
                              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={editReminderForm?.recurring||'none'} onChange={e=>setEditReminderForm(f=>({...(f as any), recurring: e.target.value as any}))}>
                                <option value="none">None</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={editReminderForm?.status||'upcoming'} onChange={e=>setEditReminderForm(f=>({...(f as any), status: e.target.value as any}))}>
                                <option value="upcoming">upcoming</option>
                                <option value="paid">paid</option>
                                <option value="snoozed">snoozed</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">{r.title}</p>
                              <p className="text-xs text-foreground/70">Due {r.dueDate} · {r.recurring !== 'none' ? r.recurring : 'one-time'} · {r.status}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm">₹{Number((isEditing ? editReminderForm?.amount : r.amount)||0).toLocaleString()}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={()=>saveEditReminder(idx)}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditReminder}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={()=>startEditReminder(r, idx)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={()=>deleteReminder(r, idx)}>Delete</Button>
                            <Button size="sm" variant="secondary" onClick={() => markPaid(r)}>Mark Paid</Button>
                            <Button size="sm" onClick={() => snooze(r)}>Snooze 7d</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

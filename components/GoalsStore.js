// components/GoalsStore.js
<<<<<<< HEAD
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function toKey(date) {
  const y = date.getFullYear();
  // ...existing code from HEAD version preserved...
  }

  // completion default
  return base;
}

export function GoalsProvider({ children }) {
  const todayKey = useMemo(() => toKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const [goals, setGoals] = useState([]);

  // --- Add Goal draft persistence (only keep < 5 minutes) ---
  const [draft, setDraft] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) { setDraftLoaded(true); return; }
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed?.ts || 0);
        if (age > DRAFT_TTL_MS) {
          await AsyncStorage.removeItem(DRAFT_KEY);
          setDraft(null);
        } else {
          setDraft(parsed);
        }
      } catch {
        setDraft(null);
      } finally {
        setDraftLoaded(true);
      }
    })();
  }, []);

  const saveDraft = async (data) => {
    const payload = { ts: Date.now(), data };
    setDraft(payload);
    try { await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch {}
  };

  const clearDraft = async () => {
    setDraft(null);
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const markJustSaved = async () => {
    try { await AsyncStorage.setItem(LAST_SAVED_KEY, String(Date.now())); } catch {}
  };

  const getLastSavedAt = async () => {
    try {
      const v = await AsyncStorage.getItem(LAST_SAVED_KEY);
      return Number(v) || 0;
    } catch {
      return 0;
    }
  };

  // --- Goal CRUD ---
  const addGoal = (goalDraft) => {
    const id = uid();
    const now = Date.now();

    const normalized = normalizeDraftForGoal(goalDraft);

    const goal = {
      id,
      createdAt: now,
      logs: baseLogs(),
      ...normalized,
    };

    setGoals((prev) => [goal, ...prev]);
    return id;
  };

  const updateGoal = (goalId, patch) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        return { ...g, ...patch };
      })
    );
  };

  const saveGoalEdits = (goalId, goalDraft) => {
=======
import React, { createContext, useContext, useMemo, useState } from "react";

const GoalsContext = createContext(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isScheduledOn(goal, date = new Date()) {
  const day = new Date(date).getDay();
  return goal?.schedule?.days?.includes(day);
}

export function isWithinActiveRange(goal, date = new Date()) {
  const d = startOfDay(date).getTime();
  const start = goal?.timeBound?.startDate ? startOfDay(goal.timeBound.startDate).getTime() : null;
  const end = goal?.timeBound?.endDate ? startOfDay(goal.timeBound.endDate).getTime() : null;

  if (start !== null && d < start) return false;
  if (end !== null && d > end) return false;
  return true;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// streak counts consecutive scheduled days ending at "refDateKey"
function computeStreak(goal, refDateKey) {
  const ref = startOfDay(fromKey(refDateKey));
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const day = addDays(ref, -i);
    if (!isWithinActiveRange(goal, day)) continue;
    if (!isScheduledOn(goal, day)) continue;

    const k = toKey(day);
    let met = false;

    if (goal.type === "completion") {
      met = !!goal.logs?.completion?.[k]?.done;
    } else {
      const v = goal.logs?.quantity?.[k]?.value ?? 0;
      met = v >= (goal.measurable?.target ?? 0);
    }

    if (met) streak += 1;
    else break;
  }

  return streak;
}

const INITIAL_GOALS = [
  {
    id: "g1",
    name: "Read 1 Chapter",
    category: "Mind",
    type: "completion",
    measurable: { target: 1, unit: "times" },
    schedule: { type: "days", days: [1, 3, 5] },
    frequencyLabel: "MWF",
    timeBound: { enabled: false, startDate: null, endDate: null },
    smart: {
      specific: "Read one chapter from any book.",
      measurable: "1 chapter",
      achievable: "Start with any easy book.",
      relevant: "Build focus and learning.",
      timeBound: "",
    },
    plan: { when: "Morning", where: "Desk", cue: "After breakfast", reward: "Tea" },
    logs: { completion: {}, quantity: {} },
    stats: { streak: 0, longestStreak: 0 },
    createdAt: Date.now(),
  },
];

export function GoalsProvider({ children }) {
  const todayKey = toKey(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [goals, setGoals] = useState(() => {
    // init streaks based on today
    return INITIAL_GOALS.map((g) => {
      const s = computeStreak(g, todayKey);
      return { ...g, stats: { streak: s, longestStreak: s } };
    });
  });

  const addGoal = (draft) => {
    const goal = {
      id: uid(),
      name: (draft.name || "New Goal").trim(),
      category: draft.category || "Custom",
      type: draft.type || "completion",
      measurable: draft.measurable || { target: 1, unit: "times" },
      schedule: draft.schedule,
      frequencyLabel: draft.frequencyLabel,
      timeBound: draft.timeBound || { enabled: false, startDate: null, endDate: null },
      smart: draft.smart || { specific: "", measurable: "", achievable: "", relevant: "", timeBound: "" },
      plan: draft.plan || { when: "", where: "", cue: "", reward: "" },
      logs: { completion: {}, quantity: {} },
      stats: { streak: 0, longestStreak: 0 },
      createdAt: Date.now(),
    };

    const s = computeStreak(goal, selectedDateKey);
    goal.stats.streak = s;
    goal.stats.longestStreak = s;

    setGoals((prev) => [goal, ...prev]);
    return goal.id;
  };

  const toggleCompleteForKey = (goalId, dateKey) => {
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;

<<<<<<< HEAD
        const next = normalizeDraftForGoal(goalDraft);

        // If kind changes, reset logs to avoid invalid “done” math
        const kindChanged = (next.kind || "completion") !== (g.kind || "completion");
        const logs = kindChanged ? baseLogs() : (g.logs || baseLogs());

        // Preserve flex progress if still flex
        if (!kindChanged && g.kind === "flex" && next.kind === "flex") {
          const existingFlex = g.logs?.flex || { total: 0, entries: [] };
          return { ...g, ...next, logs: { ...logs, flex: existingFlex } };
        }

        return { ...g, ...next, logs };
      })
    );
  };

  const getGoal = (goalId) => goals.find((g) => g.id === goalId);

  // --- Completion helpers ---
  const toggleCompletion = (goalId, dateKey = selectedDateKey) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const completion = { ...(g.logs?.completion || {}) };
        const cur = completion?.[dateKey]?.done === true;
        if (cur) {
          const next = { ...completion };
          delete next[dateKey];
          return { ...g, logs: { ...g.logs, completion: next } };
        }
        return { ...g, logs: { ...g.logs, completion: { ...completion, [dateKey]: { done: true } } } };
=======
        const completion = { ...(g.logs?.completion || {}) };
        const doneNow = !!completion[dateKey]?.done;

        if (doneNow) delete completion[dateKey];
        else completion[dateKey] = { done: true };

        const next = { ...g, logs: { ...g.logs, completion } };

        const streak = computeStreak(next, dateKey);
        const longest = Math.max(next.stats.longestStreak || 0, streak);

        return { ...next, stats: { ...next.stats, streak, longestStreak: longest } };
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
      })
    );
  };

<<<<<<< HEAD
  const setNumeric = (goalId, value, dateKey = selectedDateKey) => {
    const v = Number(value);
    const safe = Number.isFinite(v) ? v : 0;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const numeric = { ...(g.logs?.numeric || {}) };
        return { ...g, logs: { ...g.logs, numeric: { ...numeric, [dateKey]: { value: safe } } } };
=======
  const addQuantityForKey = (goalId, dateKey, delta) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;

        const quantity = { ...(g.logs?.quantity || {}) };
        const cur = quantity[dateKey]?.value ?? 0;
        const nextVal = Math.max(0, cur + delta);

        quantity[dateKey] = { value: nextVal };
        const next = { ...g, logs: { ...g.logs, quantity } };

        const streak = computeStreak(next, dateKey);
        const longest = Math.max(next.stats.longestStreak || 0, streak);

        return { ...next, stats: { ...next.stats, streak, longestStreak: longest } };
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
      })
    );
  };

<<<<<<< HEAD
  const addTimerSeconds = (goalId, secondsToAdd, dateKey = selectedDateKey) => {
    const add = Math.max(0, Number(secondsToAdd) || 0);
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const timer = { ...(g.logs?.timer || {}) };
        const cur = timer?.[dateKey]?.seconds ?? 0;
        return { ...g, logs: { ...g.logs, timer: { ...timer, [dateKey]: { seconds: cur + add } } } };
=======
  const setQuantityForKey = (goalId, dateKey, value) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;

        const quantity = { ...(g.logs?.quantity || {}) };
        quantity[dateKey] = { value: Math.max(0, Number(value) || 0) };

        const next = { ...g, logs: { ...g.logs, quantity } };

        const streak = computeStreak(next, dateKey);
        const longest = Math.max(next.stats.longestStreak || 0, streak);

        return { ...next, stats: { ...next.stats, streak, longestStreak: longest } };
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
      })
    );
  };

<<<<<<< HEAD
  const toggleChecklistItem = (goalId, itemId, dateKey = selectedDateKey) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const checklist = { ...(g.logs?.checklist || {}) };
        const cur = new Set(checklist?.[dateKey]?.checkedIds || []);
        if (cur.has(itemId)) cur.delete(itemId);
        else cur.add(itemId);
        return { ...g, logs: { ...g.logs, checklist: { ...checklist, [dateKey]: { checkedIds: [...cur] } } } };
      })
    );
  };

  // --- Flexible deadline goals ---
  const addFlexProgress = (goalId, delta, dateKey = selectedDateKey) => {
    const d = Number(delta);
    const safe = Number.isFinite(d) ? d : 0;
    if (safe === 0) return;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        if (g.kind !== "flex") return g;

        const flexLog = g.logs?.flex || { total: 0, entries: [] };
        const nextTotal = Math.max(0, (flexLog.total || 0) + safe);
        const nextEntries = [...(flexLog.entries || []), { dateKey, delta: safe }];

        return { ...g, logs: { ...g.logs, flex: { total: nextTotal, entries: nextEntries } } };
      })
    );
  };

  const flexIsComplete = (g) => {
    if (g.kind !== "flex") return false;
    const total = g.logs?.flex?.total ?? 0;
    const target = g.flex?.target ?? 0;
    return total >= target && target > 0;
  };

  const flexVisibleOnDate = (g, dateKey, todayKeyLocal) => {
    // Past dates: only show if progress entry exists that day
    if (dateKey < todayKeyLocal) {
      return (g.logs?.flex?.entries || []).some((e) => e.dateKey === dateKey);
    }
    // Today/future: show until complete, within active range and before deadline
    const deadlineKey = g.flex?.deadlineKey;
    if (deadlineKey && dateKey > deadlineKey) return false;
    if (flexIsComplete(g)) return false;
    return true;
  };

  const flexWarning = (g, dateKey) => {
    if (g.kind !== "flex") return null;
    if (flexIsComplete(g)) return null;

    const deadlineKey = g.flex?.deadlineKey;
    if (!deadlineKey) return null;

    const d0 = fromKey(dateKey);
    const dl = fromKey(deadlineKey);
    const left = daysBetween(d0, dl);

    const warnDays = g.flex?.warnDays || [7, 3, 1];
    const shouldWarn = warnDays.includes(left) || left <= 0;
    if (!shouldWarn) return null;

    const remaining = Math.max(0, (g.flex?.target ?? 0) - (g.logs?.flex?.total ?? 0));
    return { daysLeft: left, remaining };
  };

  // --- Derived list for the selected day ---
  const getGoalsForDate = (dateKey = selectedDateKey) => {
    const date = fromKey(dateKey);
    const todayK = toKey(new Date());

    const scheduled = goals
      .filter((g) => g.schedule?.mode !== "floating")
      .filter((g) => isWithinActiveRange(g, date))
      .filter((g) => isScheduledOn(g, date));

    const floating = goals
      .filter((g) => g.schedule?.mode === "floating" && g.kind === "flex")
      .filter((g) => isWithinActiveRange(g, date))
      .filter((g) => flexVisibleOnDate(g, dateKey, todayK));

    return { scheduled, floating };
  };

  // --- Day done logic (for list droplet fill) ---
  const isDoneForDay = (g, dateKey = selectedDateKey) => {
    if (g.kind === "completion") return !!g.logs?.completion?.[dateKey]?.done;
    if (g.kind === "numeric") return (g.logs?.numeric?.[dateKey]?.value ?? 0) >= (g.measurable?.target ?? 0);
    if (g.kind === "timer") return (g.logs?.timer?.[dateKey]?.seconds ?? 0) >= (g.timer?.targetSeconds ?? 0);
    if (g.kind === "checklist") {
      const ids = g.checklist?.items?.map((x) => x.id) || [];
      if (!ids.length) return false;
      const checked = new Set(g.logs?.checklist?.[dateKey]?.checkedIds || []);
      return ids.every((id) => checked.has(id));
    }
    if (g.kind === "flex") return flexIsComplete(g);
    return false;
  };

  // --- Simple stats helpers (7-day done count + streak) ---
  const getLast7Keys = (dateKey = selectedDateKey) =>
    Array.from({ length: 7 }, (_, i) => addDaysKey(dateKey, -(6 - i)));

  const getStreak = (g, dateKey = selectedDateKey) => {
    let streak = 0;
    let k = dateKey;
    for (let i = 0; i < 365; i++) {
      if (!isDoneForDay(g, k)) break;
      streak += 1;
      k = addDaysKey(k, -1);
    }
    return streak;
  };

  // --- Add flow reset helpers (after saving) ---
  const resetAddFlow = async () => {
    await clearDraft();
    await markJustSaved();
  };

  const value = useMemo(
    () => ({
      goals,
      getGoal,
      selectedDateKey,
      setSelectedDateKey,

      addGoal,
      updateGoal,
      saveGoalEdits,

      // actions
      toggleCompletion,
      setNumeric,
      addTimerSeconds,
      toggleChecklistItem,
      addFlexProgress,

      // helpers
      getGoalsForDate,
      isDoneForDay,
      flexWarning,
      getLast7Keys,
      getStreak,
      addDaysKey,

      // draft
      draft,
      draftLoaded,
      saveDraft,
      clearDraft,
      resetAddFlow,
      getLastSavedAt,
    }),
    [goals, selectedDateKey, draft, draftLoaded]
=======
  const value = useMemo(
    () => ({
      goals,
      selectedDateKey,
      setSelectedDateKey,
      addGoal,
      toggleCompleteForKey,
      addQuantityForKey,
      setQuantityForKey,
    }),
    [goals, selectedDateKey]
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used inside GoalsProvider");
  return ctx;
<<<<<<< HEAD
}
=======
}
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)

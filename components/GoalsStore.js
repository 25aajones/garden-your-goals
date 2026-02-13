// components/GoalsStore.js
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
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;

        const completion = { ...(g.logs?.completion || {}) };
        const doneNow = !!completion[dateKey]?.done;

        if (doneNow) delete completion[dateKey];
        else completion[dateKey] = { done: true };

        const next = { ...g, logs: { ...g.logs, completion } };

        const streak = computeStreak(next, dateKey);
        const longest = Math.max(next.stats.longestStreak || 0, streak);

        return { ...next, stats: { ...next.stats, streak, longestStreak: longest } };
      })
    );
  };

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
      })
    );
  };

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
      })
    );
  };

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
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used inside GoalsProvider");
  return ctx;
}

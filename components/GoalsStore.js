// components/GoalsStore.js
import React, { createContext, useContext, useMemo, useState } from "react";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const GoalsContext = createContext(null);

const INITIAL_GOALS = [
  {
    id: "g1",
    name: "Read 1 Chapter of any Book",
    frequencyLabel: "MWF",
    schedule: { type: "days", days: [1, 3, 5] }, // Mon Wed Fri
    createdAt: Date.now(),
    streak: 0,
    longestStreak: 0,
    completions: {}, // { "YYYY-MM-DD": true }
  },
  {
    id: "g2",
    name: "Drink 8 Cups of Water",
    frequencyLabel: "Everyday",
    schedule: { type: "everyday", days: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: Date.now(),
    streak: 0,
    longestStreak: 0,
    completions: {},
  },
  {
    id: "g3",
    name: "Do 10 Pushups",
    frequencyLabel: "Weekdays",
    schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] },
    createdAt: Date.now(),
    streak: 0,
    longestStreak: 0,
    completions: {},
  },
];

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
export function toKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isScheduledToday(goal, date = new Date()) {
  const day = new Date(date).getDay(); // 0 Sun .. 6 Sat
  return goal?.schedule?.days?.includes(day);
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState(INITIAL_GOALS);

  const addGoal = (goalDraft) => {
    const goal = {
      id: uid(),
      name: goalDraft.name.trim() || "New Habit Name",
      frequencyLabel: goalDraft.frequencyLabel,
      schedule: goalDraft.schedule,
      createdAt: Date.now(),
      streak: 0,
      longestStreak: 0,
      completions: {},
    };
    setGoals((prev) => [goal, ...prev]);
    return goal.id;
  };

  const toggleCompleteForDate = (goalId, date = new Date()) => {
    const key = toKey(date);

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;

        const currentlyDone = !!g.completions[key];
        const completions = { ...g.completions, [key]: !currentlyDone };

        // Simple streak logic:
        // If marking today complete, increment streak (only if scheduled today)
        // If unmarking, decrement (min 0)
        let streak = g.streak;
        if (isScheduledToday(g, date)) {
          streak = currentlyDone ? Math.max(0, streak - 1) : streak + 1;
        }

        const longestStreak = Math.max(g.longestStreak, streak);

        return { ...g, completions, streak, longestStreak };
      })
    );
  };

  const value = useMemo(
    () => ({
      goals,
      addGoal,
      toggleCompleteForDate,
      isScheduledToday,
    }),
    [goals]
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used inside GoalsProvider");
  return ctx;
}

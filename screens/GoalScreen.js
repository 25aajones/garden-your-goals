// screens/GoalScreen.js
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Modal } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals, fromKey, toKey, isValidDateKey } from "../components/GoalsStore";

function fmtDate(key) {
  const d = fromKey(key);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function CheckPill({ checked }) {
  return (
    <View style={[styles.checkPill, checked && styles.checkPillOn]}>
      <Text style={[styles.checkPillText, checked && styles.checkPillTextOn]}>
        {checked ? "✓ Done" : "□ Not done"}
      </Text>
    </View>
  );
}

export default function GoalScreen({ navigation, route }) {
  const { goalId } = route.params;

  const {
    getGoal,
    selectedDateKey,
    setSelectedDateKey,
    saveGoalEdits,
    toggleCompletion,
    setNumeric,
    addTimerSeconds,
    toggleChecklistItem,
    addFlexProgress,
    isDoneForDay,
    flexWarning,
    getLast7Keys,
    getStreak,
    addDaysKey,
  } = useGoals();

  const goal = getGoal(goalId);
  const dateKey = selectedDateKey;

  const [dateModal, setDateModal] = useState(false);
  const [dateInput, setDateInput] = useState(dateKey);

  const doneToday = goal ? isDoneForDay(goal, dateKey) : false;

  const todayNumeric = goal?.logs?.numeric?.[dateKey]?.value ?? 0;
  const todaySeconds = goal?.logs?.timer?.[dateKey]?.seconds ?? 0;
  const todayChecked = new Set(goal?.logs?.checklist?.[dateKey]?.checkedIds || []);
  const flexTotal = goal?.logs?.flex?.total ?? 0;

  const warning = goal ? flexWarning(goal, dateKey) : null;

  const weeklyStats = useMemo(() => {
    if (!goal) return { doneCount: 0, totalDays: 7 };
    const keys = getLast7Keys(dateKey);
    const doneCount = keys.reduce((acc, k) => acc + (isDoneForDay(goal, k) ? 1 : 0), 0);
    return { doneCount, totalDays: 7 };
  }, [goal, dateKey, getLast7Keys, isDoneForDay]);

  const streak = useMemo(() => (goal ? getStreak(goal, dateKey) : 0), [goal, dateKey, getStreak]);

  if (!goal) {
    return (
      <Page>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.muted, fontWeight: "900" }}>Goal not found.</Text>
        </View>
      </Page>
    );
  }

  const openEditWizard = () => {
    // Jump to Add tab, open EditGoal screen in Add stack
    navigation.getParent()?.navigate("Add", { screen: "EditGoal", params: { goalId } });
  };

  return (
    <Page>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Back</Text>
        </Pressable>

        <Pressable onPress={() => { setDateInput(dateKey); setDateModal(true); }} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{fmtDate(dateKey)}</Text>
        </Pressable>

        <Pressable onPress={openEditWizard} style={[styles.headerBtn, { backgroundColor: theme.accent }]}>
          <Text style={[styles.headerBtnText, { color: theme.bg }]}>Edit</Text>
        </Pressable>
      </View>

      {/* Overview card */}
      <View style={styles.card}>
        <Text style={styles.title}>{goal.name}</Text>
        <Text style={styles.sub}>{goal.frequencyLabel} • {goal.kind}</Text>

        <View style={styles.rowWrap}>
          <StatPill label="This week" value={`${weeklyStats.doneCount}/7`} />
          <StatPill label="Streak" value={`${streak}`} />
          <StatPill label="Today" value={doneToday ? "Done" : "Not yet"} />
        </View>

        <View style={{ marginTop: 12 }}>
          <CheckPill checked={doneToday} />
        </View>

        {/* Completion */}
        {goal.kind === "completion" && (
          <Pressable
            onPress={() => toggleCompletion(goalId, dateKey)}
            style={[styles.actionBtn, doneToday && { backgroundColor: theme.surface2 }]}
          >
            <Text style={[styles.actionText, doneToday && { color: theme.text }]}>
              {doneToday ? "Undo for today" : "Mark complete for today"}
            </Text>
          </Pressable>
        )}

        {/* Numeric */}
        {goal.kind === "numeric" && (
          <>
            <Text style={styles.section}>Today’s progress</Text>
            <View style={styles.row}>
              <TextInput
                value={String(todayNumeric)}
                onChangeText={(t) => setNumeric(goalId, t, dateKey)}
                keyboardType="numeric"
                style={[styles.input, { flex: 1, marginRight: 10 }]}
              />
              <View style={styles.unitPill}>
                <Text style={styles.unitText}>{goal.measurable?.unit}</Text>
              </View>
            </View>
            <Text style={styles.helper}>
              Target: {goal.measurable?.target} {goal.measurable?.unit}
            </Text>
          </>
        )}

        {/* Timer */}
        {goal.kind === "timer" && (
          <>
            <Text style={styles.section}>Today’s timer</Text>
            <Text style={styles.helper}>
              {Math.floor(todaySeconds / 60)}m {todaySeconds % 60}s • Target {Math.round((goal.timer?.targetSeconds ?? 0) / 60)}m
            </Text>
            <View style={styles.rowWrap}>
              <Pressable onPress={() => addTimerSeconds(goalId, 60, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+1 min</Text>
              </Pressable>
              <Pressable onPress={() => addTimerSeconds(goalId, 300, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+5 min</Text>
              </Pressable>
              <Pressable onPress={() => addTimerSeconds(goalId, 900, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+15 min</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Checklist */}
        {goal.kind === "checklist" && (
          <>
            <Text style={styles.section}>Checklist</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {(goal.checklist?.items || []).map((it) => {
                const checked = todayChecked.has(it.id);
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => toggleChecklistItem(goalId, it.id, dateKey)}
                    style={[styles.checkRow, checked && { backgroundColor: theme.surface2 }]}
                  >
                    <View style={[styles.box, checked && { backgroundColor: theme.accent, borderColor: theme.accent }]} />
                    <Text
                      style={[
                        styles.checkText,
                        checked && { textDecorationLine: "line-through", color: theme.muted },
                      ]}
                      numberOfLines={2}
                    >
                      {it.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Flexible by deadline */}
        {goal.kind === "flex" && (
          <>
            <Text style={styles.section}>Flexible progress</Text>
            <Text style={styles.helper}>
              {flexTotal}/{goal.flex?.target} {goal.flex?.unit} • Deadline {goal.flex?.deadlineKey}
            </Text>

            {warning && (
              <View style={styles.warn}>
                <Text style={styles.warnTitle}>Deadline warning</Text>
                <Text style={styles.warnText}>
                  {warning.daysLeft <= 0
                    ? `Deadline is today or passed — ${warning.remaining} remaining.`
                    : `${warning.daysLeft} days left — ${warning.remaining} remaining.`}
                </Text>
              </View>
            )}

            <View style={styles.rowWrap}>
              <Pressable onPress={() => addFlexProgress(goalId, 1, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+1</Text>
              </Pressable>
              <Pressable onPress={() => addFlexProgress(goalId, 5, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+5</Text>
              </Pressable>
              <Pressable onPress={() => addFlexProgress(goalId, 10, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>+10</Text>
              </Pressable>
              <Pressable onPress={() => addFlexProgress(goalId, -1, dateKey)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>-1</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Date chooser modal */}
      <Modal visible={dateModal} transparent animationType="fade" onRequestClose={() => setDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose date</Text>
            <Text style={styles.modalHint}>Type YYYY-MM-DD</Text>

            <TextInput
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="2026-02-27"
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />

            {!isValidDateKey(dateInput) && (
              <Text style={styles.modalWarn}>Enter a valid date like 2026-03-28</Text>
            )}

            <View style={styles.rowWrap}>
              <Pressable onPress={() => setSelectedDateKey(toKey(new Date()))} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Today</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedDateKey(addDaysKey(dateKey, -1))} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Prev</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedDateKey(addDaysKey(dateKey, 1))} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Next</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setDateModal(false)} style={[styles.headerBtn, { flex: 1 }]}>
                <Text style={styles.headerBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!isValidDateKey(dateInput)) return;
                  setSelectedDateKey(dateInput);
                  setDateModal(false);
                }}
                style={[styles.headerBtn, { flex: 1, backgroundColor: theme.accent }]}
              >
                <Text style={[styles.headerBtnText, { color: theme.bg }]}>Set</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 },
  headerBtn: { paddingHorizontal: 12, height: 40, borderRadius: theme.radius, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  headerBtnText: { fontWeight: "900", color: theme.text },

  dateBtn: { flex: 1, height: 40, borderRadius: theme.radius, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  dateBtnText: { fontWeight: "900", color: theme.text, fontSize: 12 },

  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "900", color: theme.text },
  sub: { marginTop: 6, fontSize: 12, fontWeight: "800", color: theme.muted },

  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },

  statPill: { backgroundColor: theme.surface2, borderRadius: theme.radius, paddingHorizontal: 12, paddingVertical: 10 },
  statLabel: { fontSize: 10, fontWeight: "900", color: theme.muted },
  statValue: { marginTop: 4, fontSize: 12, fontWeight: "900", color: theme.text },

  checkPill: { backgroundColor: theme.surface2, borderRadius: theme.radius, paddingHorizontal: 12, paddingVertical: 10, alignSelf: "flex-start" },
  checkPillOn: { backgroundColor: theme.accent },
  checkPillText: { fontWeight: "900", color: theme.text },
  checkPillTextOn: { color: theme.bg },

  section: { marginTop: 12, fontSize: 12, fontWeight: "900", color: theme.text },
  helper: { marginTop: 6, fontSize: 12, fontWeight: "800", color: theme.muted, lineHeight: 16 },

  actionBtn: { marginTop: 12, height: 46, borderRadius: theme.radius, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  actionText: { fontWeight: "900", color: theme.bg },

  input: { marginTop: 8, height: 46, borderRadius: theme.radius, backgroundColor: theme.surface2, paddingHorizontal: 14, fontWeight: "800", color: theme.text },

  unitPill: { height: 46, borderRadius: theme.radius, backgroundColor: theme.surface2, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  unitText: { fontWeight: "900", color: theme.text },

  smallBtn: { height: 40, paddingHorizontal: 14, borderRadius: theme.radius, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontWeight: "900", color: theme.text },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: theme.radius, backgroundColor: theme.surface },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: theme.outline },
  checkText: { flex: 1, fontWeight: "900", color: theme.text },

  warn: { marginTop: 12, backgroundColor: theme.dangerBg, borderRadius: theme.radius, padding: 12 },
  warnTitle: { fontWeight: "900", color: theme.dangerText },
  warnText: { marginTop: 6, fontWeight: "800", color: theme.dangerText, lineHeight: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 18 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16 },
  modalTitle: { fontSize: 14, fontWeight: "900", color: theme.text },
  modalHint: { marginTop: 6, fontSize: 12, fontWeight: "800", color: theme.muted },
  modalWarn: { marginTop: 6, fontSize: 11, fontWeight: "900", color: theme.dangerText },
});
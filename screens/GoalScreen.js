// screens/GoalScreen.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from "react-native";
import { useGoals, toKey } from "../components/GoalsStore";

function Droplet({ filled }) {
  return (
    <View
      style={[
        styles.droplet,
        filled ? styles.dropletFilled : styles.dropletOutline,
      ]}
    />
  );
}

export default function GoalScreen({ route, navigation }) {
  const { goalId } = route.params;
  const { goals, toggleCompleteForDate, isScheduledToday } = useGoals();

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);

  const today = new Date();
  const todayKey = toKey(today);

  if (!goal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          <Text style={{ fontWeight: "900" }}>Goal not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const doneToday = !!goal.completions[todayKey];
  const scheduledToday = isScheduledToday(goal, today);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {/* Header (back + little icons like your screens) */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {goal.name}
          </Text>

          <View style={styles.headerIcons}>
            <View style={styles.headerIcon} />
            <View style={styles.headerIcon} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Streak cards like profile pages */}
          <View style={styles.streakRow}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>🔥 {goal.streak} Days</Text>
            </View>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Longest Streak</Text>
              <Text style={styles.streakValue}>🏆 {goal.longestStreak} Days</Text>
            </View>
          </View>

          {/* Main action panel (tan) */}
          <View style={styles.panel}>
            <View style={styles.panelTop}>
              <View style={styles.leftIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.goalTitle}>{goal.name}</Text>
                <Text style={styles.goalSub}>{goal.frequencyLabel}</Text>
                <Text style={styles.goalHint}>
                  {scheduledToday
                    ? "Scheduled for today"
                    : "Not scheduled today"}
                </Text>
              </View>

              <Pressable
                onPress={() => toggleCompleteForDate(goal.id, today)}
                style={styles.completeBtn}
              >
                <Droplet filled={doneToday} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Simple “week strip” preview like your top day selector */}
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.weekRow}>
              {["S", "M", "T", "W", "Th", "F", "Sa"].map((d, idx) => {
                const scheduled = goal.schedule.days.includes(idx);
                return (
                  <View
                    key={d}
                    style={[
                      styles.weekPill,
                      scheduled ? styles.weekPillOn : styles.weekPillOff,
                    ]}
                  >
                    <Text style={styles.weekText}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Stats area (green-ish cards) */}
          <View style={styles.statsPanel}>
            <Text style={styles.sectionTitleDark}>Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Done Today</Text>
                <Text style={styles.statValue}>{doneToday ? "Yes" : "No"}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Scheduled Today</Text>
                <Text style={styles.statValue}>{scheduledToday ? "Yes" : "No"}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <Pressable
            style={styles.primaryBtn}
            onPress={() => toggleCompleteForDate(goal.id, today)}
          >
            <Text style={styles.primaryText}>
              {doneToday ? "Undo Today" : "Mark Complete"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3eade" },
  page: { flex: 1, backgroundColor: "#f3eade", paddingHorizontal: 14 },

  headerRow: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#d4c6b3",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, fontWeight: "900", color: "#2f2a20" },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#2f2a20",
  },
  headerIcons: { flexDirection: "row", gap: 8 },
  headerIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#d4c6b3",
  },

  streakRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  streakCard: {
    flex: 1,
    backgroundColor: "#dff0a9",
    borderRadius: 14,
    padding: 12,
  },
  streakLabel: { fontSize: 11, fontWeight: "800", color: "#2f2a20" },
  streakValue: { marginTop: 6, fontSize: 14, fontWeight: "900", color: "#2f2a20" },

  panel: {
    backgroundColor: "#d4c6b3",
    borderRadius: 16,
    padding: 14,
  },
  panelTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  leftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7f6a54",
  },
  goalTitle: { fontSize: 14, fontWeight: "900", color: "#2f2a20" },
  goalSub: { fontSize: 11, fontWeight: "800", color: "#3f382e", marginTop: 2 },
  goalHint: { fontSize: 10, fontWeight: "700", color: "#6e6153", marginTop: 4 },

  completeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f3eade",
    alignItems: "center",
    justifyContent: "center",
  },

  droplet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    transform: [{ rotate: "20deg" }],
  },
  dropletOutline: { borderWidth: 2, borderColor: "#7a6a56" },
  dropletFilled: { backgroundColor: "#7a6a56" },

  divider: {
    height: 1,
    backgroundColor: "#b9a78f",
    marginVertical: 12,
  },

  sectionTitle: { fontSize: 12, fontWeight: "900", color: "#2f2a20" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  weekPill: {
    width: 42,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekPillOn: { backgroundColor: "#6e6153" },
  weekPillOff: { backgroundColor: "#f3eade" },
  weekText: { fontSize: 11, fontWeight: "900", color: "#2f2a20" },

  statsPanel: {
    marginTop: 12,
    backgroundColor: "#dff0a9",
    borderRadius: 16,
    padding: 14,
  },
  sectionTitleDark: { fontSize: 12, fontWeight: "900", color: "#2f2a20" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#f3eade",
    borderRadius: 14,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontWeight: "800", color: "#3f382e" },
  statValue: { marginTop: 6, fontSize: 14, fontWeight: "900", color: "#2f2a20" },

  primaryBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#6e6153",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#f3eade", fontWeight: "900", fontSize: 14 },
});

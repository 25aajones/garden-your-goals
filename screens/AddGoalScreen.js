// screens/AddGoalScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
} from "react-native";
import { useGoals } from "../components/GoalsStore";

const DAYS = [
  { label: "SUN", day: 0 },
  { label: "MON", day: 1 },
  { label: "TUE", day: 2 },
  { label: "WED", day: 3 },
  { label: "THU", day: 4 },
  { label: "FRI", day: 5 },
  { label: "SAT", day: 6 },
];

export default function AddGoalScreen({ navigation }) {
  const { addGoal } = useGoals();

  const [name, setName] = useState("");
  const [mode, setMode] = useState("everyday"); // everyday | weekdays | days
  const [days, setDays] = useState([1, 3, 5]); // default MWF

  const frequencyLabel = useMemo(() => {
    if (mode === "everyday") return "Everyday";
    if (mode === "weekdays") return "Weekdays";
    // days -> compress like MWF, TTh, etc.
    const map = { 0: "S", 1: "M", 2: "T", 3: "W", 4: "Th", 5: "F", 6: "Sa" };
    const ordered = [...days].sort((a, b) => a - b).map((d) => map[d]);
    return ordered.join("");
  }, [mode, days]);

  const save = () => {
    const scheduleDays =
      mode === "everyday"
        ? [0, 1, 2, 3, 4, 5, 6]
        : mode === "weekdays"
        ? [1, 2, 3, 4, 5]
        : days.length
        ? days
        : [1]; // fallback

    const id = addGoal({
      name,
      frequencyLabel,
      schedule: { type: mode, days: scheduleDays },
    });

    // After saving: jump to Habits tab + open Goal page
    navigation.navigate("Habits", {
      screen: "Goal",
      params: { goalId: id },
    });
  };

  const toggleDay = (d) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Add Habit</Text>
          <View style={styles.headerIcons}>
            <View style={styles.headerIcon} />
            <View style={styles.headerIcon} />
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="New Habit Name"
            placeholderTextColor="#8a7b69"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Frequency</Text>

          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setMode("everyday")}
              style={[styles.segment, mode === "everyday" && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === "everyday" && styles.segmentTextActive]}>
                Everyday
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("weekdays")}
              style={[styles.segment, mode === "weekdays" && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === "weekdays" && styles.segmentTextActive]}>
                Weekdays
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("days")}
              style={[styles.segment, mode === "days" && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === "days" && styles.segmentTextActive]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {mode === "days" && (
            <>
              <Text style={[styles.helper, { marginTop: 10 }]}>
                Choose days
              </Text>
              <View style={styles.dayRow}>
                {DAYS.map((d) => {
                  const active = days.includes(d.day);
                  return (
                    <Pressable
                      key={d.label}
                      onPress={() => toggleDay(d.day)}
                      style={[styles.dayPill, active && styles.dayPillActive]}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>{frequencyLabel}</Text>
          </View>
        </View>

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveText}>Save Habit</Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3eade" },
  page: { flex: 1, paddingHorizontal: 16, backgroundColor: "#f3eade" },

  headerRow: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#2f2a20" },
  headerIcons: { flexDirection: "row", gap: 8 },
  headerIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#d4c6b3",
  },

  card: {
    backgroundColor: "#d4c6b3",
    borderRadius: 16,
    padding: 14,
  },
  label: { fontSize: 12, fontWeight: "800", color: "#2f2a20" },
  input: {
    marginTop: 6,
    backgroundColor: "#f3eade",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#2f2a20",
  },

  segmentRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f3eade",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#6e6153" },
  segmentText: { fontSize: 12, fontWeight: "800", color: "#3a332a" },
  segmentTextActive: { color: "#f3eade" },

  helper: { fontSize: 11, fontWeight: "700", color: "#3f382e" },

  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dayPill: {
    width: 42,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f3eade",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: { backgroundColor: "#6e6153" },
  dayText: { fontSize: 10, fontWeight: "800", color: "#3a332a" },
  dayTextActive: { color: "#f3eade" },

  previewRow: {
    marginTop: 14,
    backgroundColor: "#f3eade",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewLabel: { fontWeight: "900", color: "#2f2a20" },
  previewValue: { fontWeight: "900", color: "#6e6153" },

  saveBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#6e6153",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#f3eade", fontWeight: "900", fontSize: 14 },

  cancelBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#b9a78f",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#2f2a20", fontWeight: "900", fontSize: 14 },
});

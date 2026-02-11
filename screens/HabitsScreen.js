// screens/HabitsScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useGoals, toKey } from "../components/GoalsStore";

const DAYS = [
  { label: "SUN", day: 0 },
  { label: "MON", day: 1 },
  { label: "TUE", day: 2 },
  { label: "WED", day: 3 },
  { label: "THU", day: 4 },
  { label: "FRI", day: 5 },
  { label: "SAT", day: 6 },
];

function Droplet({ filled }) {
  // Simple droplet outline to match Figma vibe (no external icon libs)
  return (
    <View
      style={[
        styles.droplet,
        filled ? styles.dropletFilled : styles.dropletOutline,
      ]}
    />
  );
}

export default function HabitsScreen({ navigation }) {
  const { goals } = useGoals();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const todayKey = toKey(new Date());

  const filtered = useMemo(() => {
    return goals.filter((g) => g.schedule.days.includes(selectedDay));
  }, [goals, selectedDay]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        {/* Top Day Strip */}
        <View style={styles.dayStrip}>
          {DAYS.map((d) => {
            const active = d.day === selectedDay;
            return (
              <Pressable
                key={d.label}
                onPress={() => setSelectedDay(d.day)}
                style={[styles.dayPill, active && styles.dayPillActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Habits list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const doneToday = !!item.completions[todayKey];
            return (
              <Pressable
                style={styles.habitCard}
                onPress={() => navigation.navigate("Goal", { goalId: item.id })}
              >
                <View style={styles.leftIcon} />
                <View style={styles.habitTextWrap}>
                  <Text style={styles.habitTitle}>{item.name}</Text>
                  <Text style={styles.habitSub}>{item.frequencyLabel}</Text>
                </View>
                <Droplet filled={doneToday} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nothing Scheduled Yet</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3eade" },
  page: { flex: 1, backgroundColor: "#f3eade", paddingHorizontal: 14 },

  dayStrip: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  dayPill: {
    width: 42,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#d4c6b3",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: {
    backgroundColor: "#6e6153",
  },
  dayText: { fontSize: 10, color: "#3a332a", fontWeight: "700" },
  dayTextActive: { color: "#f3eade" },

  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dff0a9",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  leftIcon: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#7f6a54",
    marginRight: 10,
  },
  habitTextWrap: { flex: 1 },
  habitTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2f2a20",
  },
  habitSub: { fontSize: 11, color: "#3f382e", marginTop: 2 },

  droplet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    transform: [{ rotate: "20deg" }],
  },
  dropletOutline: {
    borderWidth: 2,
    borderColor: "#7a6a56",
    backgroundColor: "transparent",
  },
  dropletFilled: {
    backgroundColor: "#7a6a56",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#6e6153",
    fontWeight: "700",
  },
});

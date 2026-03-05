// screens/GoalsScreen.js
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals, fromKey, toKey, isScheduledOn, isWithinActiveRange } from "../components/GoalsStore";

// IMPORT YOUR NEW ACHIEVEMENTS STORE
// (Adjust this path if your file is in a different folder!)
import { ACHIEVEMENTS } from "../AchievementsStore";

import { collection, query, onSnapshot, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const DAYS = [
  { label: "SUN", day: 0 }, { label: "MON", day: 1 }, { label: "TUE", day: 2 },
  { label: "WED", day: 3 }, { label: "THU", day: 4 }, { label: "FRI", day: 5 }, { label: "SAT", day: 6 },
];

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function weekDates(date = new Date()) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
}

function Droplet({ filled }) {
  return <View style={[styles.droplet, filled ? styles.dropletFilled : styles.dropletOutline]} />;
}

export default function GoalsScreen({ navigation }) {
  const { selectedDateKey, setSelectedDateKey } = useGoals();
  
  const [dbGoals, setDbGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedDate = fromKey(selectedDateKey);
  const week = useMemo(() => weekDates(selectedDate), [selectedDateKey]);

  const today = new Date();
  const todayKey = toKey(today);

  useEffect(() => {
    if (!auth.currentUser) return;

    const goalsRef = collection(db, "users", auth.currentUser.uid, "goals");
    const q = query(goalsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGoals = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }));
      setDbGoals(fetchedGoals);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching goals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    return dbGoals
      .filter((g) => isWithinActiveRange(g, selectedDate))
      .filter((g) => isScheduledOn(g, selectedDate));
  }, [dbGoals, selectedDateKey]);

  const calculateStreak = (goal, newLogs) => {
    let current = 0;
    let longest = goal.longestStreak || 0;
    
    const checkToday = new Date();
    checkToday.setHours(0, 0, 0, 0);

    let checkDate = new Date(checkToday);
    
    for (let i = 0; i < 365; i++) {
      const dateKey = toKey(checkDate);
      const dayOfWeek = checkDate.getDay();

      const isScheduled = goal.schedule?.type === "everyday" 
        || (goal.schedule?.type === "weekdays" && dayOfWeek >= 1 && dayOfWeek <= 5)
        || (goal.schedule?.type === "days" && goal.schedule?.days?.includes(dayOfWeek));

      if (isScheduled) {
        let isDoneOnDate = false;
        if (goal.type === "completion") {
          isDoneOnDate = !!newLogs?.completion?.[dateKey]?.done;
        } else {
          isDoneOnDate = (newLogs?.quantity?.[dateKey]?.value ?? 0) >= (goal.measurable?.target ?? 0);
        }

        if (isDoneOnDate) {
          current++;
        } else {
          if (dateKey !== toKey(checkToday)) break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (current > longest) longest = current;
    return { currentStreak: current, longestStreak: longest };
  };

  const updateOverallAppStreak = async () => {
    if (!auth.currentUser) return 0;

    const now = new Date();
    const todayStr = toKey(now); 
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = toKey(yesterdayDate);

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const lastActiveDate = userData.lastActiveDate;
        let currentAppStreak = userData.streakCount || 0;

        if (lastActiveDate === todayStr) {
          return currentAppStreak; 
        } else if (lastActiveDate === yesterdayStr) {
          currentAppStreak += 1;
        } else {
          currentAppStreak = 1;
        }

        await updateDoc(userRef, {
          streakCount: currentAppStreak,
          lastActiveDate: todayStr
        });

        return currentAppStreak; 
      }
    } catch (error) {
      console.error("Error updating overall streak:", error);
      return 0;
    }
  };

  const checkAchievements = async (currentAppStreak) => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      
      const unlockedIds = userData.unlockedAchievements || [];
      
      // Pass both the app streak AND their overall score to the checker!
      const currentStats = {
        appStreak: currentAppStreak,
        overallScore: userData.overallScore || 0
      };

      const newlyUnlocked = ACHIEVEMENTS.filter(ach => 
        !unlockedIds.includes(ach.id) && ach.check(currentStats)
      );

      if (newlyUnlocked.length > 0) {
        const newIds = newlyUnlocked.map(ach => ach.id);
        const newTitles = newlyUnlocked.map(ach => `${ach.icon} ${ach.title}`);

        await updateDoc(userRef, {
          unlockedAchievements: arrayUnion(...newIds)
        });

        Alert.alert(
          "🏆 Achievement Unlocked!",
          `Great job! You just earned:\n\n${newTitles.join("\n")}`
        );
      }
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  };

  const handleToggleComplete = async (item, isCurrentlyDone) => {
    if (!auth.currentUser) return;

    try {
      const goalRef = doc(db, "users", auth.currentUser.uid, "goals", item.id);
      const updatedLogs = JSON.parse(JSON.stringify(item.logs || {}));
      
      if (item.type === "completion") {
        if (!updatedLogs.completion) updatedLogs.completion = {};
        updatedLogs.completion[selectedDateKey] = { done: !isCurrentlyDone };
      } else if (item.type === "quantity") {
        if (!updatedLogs.quantity) updatedLogs.quantity = {};
        const targetValue = item.measurable?.target || 1;
        updatedLogs.quantity[selectedDateKey] = { value: isCurrentlyDone ? 0 : targetValue };
      }

      const { currentStreak, longestStreak } = calculateStreak(item, updatedLogs);

      if (item.type === "completion") {
        await updateDoc(goalRef, {
          [`logs.completion.${selectedDateKey}.done`]: !isCurrentlyDone,
          currentStreak, longestStreak
        });
      } else {
        const targetValue = item.measurable?.target || 1;
        await updateDoc(goalRef, {
          [`logs.quantity.${selectedDateKey}.value`]: isCurrentlyDone ? 0 : targetValue,
          currentStreak, longestStreak
        });
      }

      if (!isCurrentlyDone) {
        const newAppStreak = await updateOverallAppStreak();
        await checkAchievements(newAppStreak);
      }

    } catch (error) {
      console.error("Error toggling goal status:", error);
      Alert.alert("Error", "Could not update goal progress.");
    }
  };

  return (
    <Page>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Goals</Text>
        <View style={styles.headerIcons}>
          <View style={styles.headerIcon} />
          <View style={styles.headerIcon} />
        </View>
      </View>

      <View style={styles.dayStrip}>
        {DAYS.map((d, idx) => {
          const dateObj = week[idx];
          const key = toKey(dateObj);
          const isSelected = key === selectedDateKey;
          const isToday = key === todayKey;

          return (
            <Pressable
              key={key}
              onPress={() => setSelectedDateKey(key)}
              style={[styles.dayPill, isSelected && styles.dayPillActive, isToday && styles.dayPillTodayOutline]}
              android_ripple={{ color: "#00000012", borderless: false }}
              hitSlop={10}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{d.label}</Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{dateObj.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const done =
              item.type === "completion"
                ? !!item.logs?.completion?.[selectedDateKey]?.done
                : (item.logs?.quantity?.[selectedDateKey]?.value ?? 0) >= (item.measurable?.target ?? 0);

            const subtitle =
              item.type === "quantity"
                ? `${item.frequencyLabel} • ${item.measurable?.target} ${item.measurable?.unit}`
                : `${item.frequencyLabel} • Completion`;

            const currentStreak = item.currentStreak || 0;

            return (
              <Pressable
                style={styles.goalCard}
                onPress={() => navigation.navigate("Goal", { goalId: item.id })}
                android_ripple={{ color: "#00000010" }}
              >
                <View style={styles.leftIcon} />
                <View style={styles.textWrap}>
                  <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
                  {!!item.plan?.when && (
                    <Text style={styles.micro} numberOfLines={1}>
                      Plan: {item.plan.when}{item.plan.where ? ` • ${item.plan.where}` : ""}
                    </Text>
                  )}
                </View>

                <Pressable 
                  style={styles.rightWrap} 
                  onPress={() => handleToggleComplete(item, done)}
                  hitSlop={15}
                >
                  {currentStreak > 0 && (
                    <Text style={styles.streakText}> {currentStreak}</Text>
                  )}
                  <Droplet filled={done} />
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 26 }}>
              <Text style={styles.empty}>Nothing Scheduled Yet</Text>
              <Text style={styles.emptySub}>Add a goal that fits this day.</Text>
            </View>
          }
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: theme.title },
  headerIcons: { flexDirection: "row" },
  headerIcon: { width: 18, height: 18, borderRadius: 6, backgroundColor: theme.surface, marginLeft: 10 },
  dayStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  dayPill: { width: 42, height: 46, borderRadius: theme.radiusSm, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", paddingVertical: 6, overflow: "hidden" },
  dayPillActive: { backgroundColor: theme.accent },
  dayPillTodayOutline: { borderWidth: 2, borderColor: theme.outline },
  dayLabel: { fontSize: 10, fontWeight: "900", color: theme.muted, lineHeight: 12 },
  dayNum: { marginTop: 2, fontSize: 12, fontWeight: "900", color: theme.muted, lineHeight: 14 },
  dayLabelActive: { color: theme.bg },
  dayNumActive: { color: theme.bg },
  goalCard: { flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: theme.radius, paddingHorizontal: 12, height: 74, marginBottom: 12, overflow: "hidden" },
  leftIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accent, marginRight: 12 },
  textWrap: { flex: 1, paddingRight: 8 },
  title: { fontSize: 14, fontWeight: "900", color: theme.text, lineHeight: 18 },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "800", color: theme.text2 },
  micro: { marginTop: 3, fontSize: 11, fontWeight: "800", color: theme.muted },
  rightWrap: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", height: 44, minWidth: 44 },
  streakText: { fontSize: 13, fontWeight: "900", color: theme.accent, marginRight: 10 },
  droplet: { width: 20, height: 20, borderRadius: 10, transform: [{ rotate: "20deg" }] },
  dropletOutline: { borderWidth: 2, borderColor: theme.accent, backgroundColor: "transparent" },
  dropletFilled: { backgroundColor: theme.accent },
  empty: { textAlign: "center", color: theme.surface, fontWeight: "900" },
  emptySub: { marginTop: 6, textAlign: "center", color: theme.muted2, fontWeight: "800" },
});
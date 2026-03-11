import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, Image } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { toKey, isScheduledOn, isWithinActiveRange } from "../components/GoalsStore";
import { ACHIEVEMENTS } from "../AchievementsStore";
import { PLANT_ASSETS } from "../constants/PlantAssets";

// Added 'increment' to the list of imports - essential for plant growth!
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs,
  setDoc,
  arrayUnion, 
  increment 
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const STORAGE_PAGE_ID = "storage";
const STORAGE_SHELF_COUNT = 10;
const STORAGE_SHELF_SLOTS = 4;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(goal) {
  const schedule = goal?.schedule;
  if (!schedule) return "No schedule";
  if (schedule.type === "everyday") return "Every day";
  if (schedule.type === "weekdays") return "Weekdays";
  if (schedule.type === "days") {
    const labels = (schedule.days || []).map((day) => DAY_LABELS[day]).filter(Boolean);
    return labels.length ? labels.join(", ") : "Custom days";
  }
  return "Custom schedule";
}

function getPlantPreviewAsset(goal) {
  const total = Number(goal?.totalCompletions) || 0;

  let stage = "stage1";
  if (total > 30) stage = "stage4";
  else if (total > 15) stage = "stage3";
  else if (total > 5) stage = "stage2";

  const status = goal?.healthLevel === 1 ? "dead" : "alive";
  const species = goal?.plantSpecies || (goal?.type !== "completion" && goal?.type !== "quantity" ? goal?.type : "fern");

  return (
    PLANT_ASSETS[species]?.[stage]?.[status] ||
    PLANT_ASSETS.fern?.stage1?.alive
  );
}

function Droplet({ filled }) {
  return <View style={[styles.droplet, filled ? styles.dropletFilled : styles.dropletOutline]} />;
}

function isGoalDoneForDate(goal, dateKey) {
  if (goal.type === "completion") {
    return !!goal.logs?.completion?.[dateKey]?.done;
  }

  return (goal.logs?.quantity?.[dateKey]?.value ?? 0) >= (goal.measurable?.target ?? 0);
}

function parseISODateAtStart(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isGoalFullyCompleted(goal, today = new Date()) {
  const completionType = goal?.completionCondition?.type || "none";
  const totalCompletions = Number(goal?.totalCompletions) || 0;
  const targetAmount = Number(goal?.completionCondition?.targetAmount) || 0;

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const endDate = parseISODateAtStart(goal?.completionCondition?.endDate);
  const reachedEndDate = !!endDate && todayStart.getTime() > endDate.getTime();
  const reachedEndAmount = targetAmount > 0 && totalCompletions >= targetAmount;

  if (completionType === "date") return reachedEndDate;
  if (completionType === "amount") return reachedEndAmount;
  if (completionType === "both") return reachedEndDate && reachedEndAmount;
  return false;
}

async function findFirstOpenStorageSlot(uid, goalId) {
  const layoutSnap = await getDocs(collection(db, "users", uid, "gardenLayout"));
  const occupied = new Set();

  layoutSnap.forEach((layoutDoc) => {
    if (layoutDoc.id === goalId) return;
    const shelfPosition = layoutDoc.data()?.shelfPosition;
    if (shelfPosition?.pageId === STORAGE_PAGE_ID) {
      occupied.add(`${shelfPosition.shelfName}_${shelfPosition.slotIndex}`);
    }
  });

  for (let shelfIdx = 0; shelfIdx < STORAGE_SHELF_COUNT; shelfIdx += 1) {
    const shelfName = `storageShelf_${shelfIdx}`;
    for (let slotIndex = 0; slotIndex < STORAGE_SHELF_SLOTS; slotIndex += 1) {
      const key = `${shelfName}_${slotIndex}`;
      if (!occupied.has(key)) {
        return { pageId: STORAGE_PAGE_ID, shelfName, slotIndex };
      }
    }
  }

  return null;
}

export default function GoalsScreen({ navigation }) {
  const [dbGoals, setDbGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayKey = toKey(today);

  useEffect(() => {
    if (!auth.currentUser) return;
    const goalsRef = collection(db, "users", auth.currentUser.uid, "goals");
    const q = query(goalsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      .filter((g) => isWithinActiveRange(g, today))
      .filter((g) => !isGoalFullyCompleted(g, today));
  }, [dbGoals, todayKey]);

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
        let isDoneOnDate = goal.type === "completion" 
          ? !!newLogs?.completion?.[dateKey]?.done 
          : (newLogs?.quantity?.[dateKey]?.value ?? 0) >= (goal.measurable?.target ?? 0);

        if (isDoneOnDate) current++;
        else if (dateKey !== toKey(checkToday)) break;
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
        let currentAppStreak = userData.streakCount || 0;
        if (userData.lastActiveDate === todayStr) return currentAppStreak; 
        currentAppStreak = (userData.lastActiveDate === yesterdayStr) ? currentAppStreak + 1 : 1;
        await updateDoc(userRef, { streakCount: currentAppStreak, lastActiveDate: todayStr });
        return currentAppStreak; 
      }
    } catch (error) {
      console.error(error);
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
      const currentStats = { appStreak: currentAppStreak, overallScore: userData.overallScore || 0 };
      const newlyUnlocked = ACHIEVEMENTS.filter(ach => !unlockedIds.includes(ach.id) && ach.check(currentStats));

      if (newlyUnlocked.length > 0) {
        const newIds = newlyUnlocked.map(ach => ach.id);
        const newTitles = newlyUnlocked.map(ach => `${ach.icon} ${ach.title}`);
        await updateDoc(userRef, { unlockedAchievements: arrayUnion(...newIds) });
        Alert.alert("🏆 Achievement Unlocked!", `Great job! You just earned:\n\n${newTitles.join("\n")}`);
      }
    } catch (error) { console.error(error); }
  };

  // --- THE NEW PROGRESS-TRACKING TOGGLE ---
  const handleToggleComplete = async (item, isCurrentlyDone) => {
    if (!auth.currentUser) return;

    try {
      const willBeDone = !isCurrentlyDone;
      const shouldArchiveToStorage =
        willBeDone &&
        (item.completionCondition?.type === "date" || item.completionCondition?.type === "both");

      const goalRef = doc(db, "users", auth.currentUser.uid, "goals", item.id);
      
      // 1. Deep copy logs to calculate new streaks locally
      const updatedLogs = JSON.parse(JSON.stringify(item.logs || {}));
      
      // 2. Determine growth change: +1 for completing, -1 for undoing
      const growthChange = isCurrentlyDone ? -1 : 1;

      if (item.type === "completion") {
        if (!updatedLogs.completion) updatedLogs.completion = {};
        updatedLogs.completion[todayKey] = { done: !isCurrentlyDone };
      } else {
        if (!updatedLogs.quantity) updatedLogs.quantity = {};
        const targetValue = item.measurable?.target || 1;
        updatedLogs.quantity[todayKey] = { value: isCurrentlyDone ? 0 : targetValue };
      }

      // 3. Calculate streak based on the hypothetical change
      const { currentStreak, longestStreak } = calculateStreak(item, updatedLogs);

      // 4. Build the update object
      const updateData = {
        currentStreak,
        longestStreak,
        totalCompletions: increment(growthChange), // Grows your plant!
        healthLevel: isCurrentlyDone ? 4 : 5      // 5 is full health
      };

      // 5. Add the dynamic path for the specific log date
      if (item.type === "completion") {
        updateData[`logs.completion.${todayKey}.done`] = !isCurrentlyDone;
      } else {
        const targetValue = item.measurable?.target || 1;
        updateData[`logs.quantity.${todayKey}.value`] = isCurrentlyDone ? 0 : targetValue;
      }

      // 6. Push to Firestore
      await updateDoc(goalRef, updateData);

      if (shouldArchiveToStorage) {
        const storageSlot = await findFirstOpenStorageSlot(auth.currentUser.uid, item.id);
        if (storageSlot) {
          await setDoc(
            doc(db, "users", auth.currentUser.uid, "gardenLayout", item.id),
            { shelfPosition: storageSlot },
            { merge: true }
          );
        }
      }

      // 7. Check App-wide streaks/achievements only if marking as DONE
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const dueToday = isScheduledOn(item, today);
            const done = isGoalDoneForDate(item, todayKey);

            const scheduleText = formatSchedule(item);

            return (
              <Pressable 
                style={[styles.goalCard, !dueToday && styles.goalCardMuted]} 
                onPress={() => navigation.navigate("Goal", { goalId: item.id })}
              >
                <View style={styles.leftIcon}>
                  <Image source={getPlantPreviewAsset(item)} style={styles.leftIconImage} resizeMode="contain" />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {scheduleText}
                  </Text>
                </View>

                <Pressable 
                  style={styles.rightWrap} 
                  onPress={() => handleToggleComplete(item, done)}
                  hitSlop={15}
                >
                  {item.currentStreak > 0 && (
                    <Text style={styles.streakText}>{item.currentStreak}</Text>
                  )}
                  <Droplet filled={done} />
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ marginTop: 26 }}>
              <Text style={styles.empty}>Nothing Scheduled Yet</Text>
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
  goalCard: { flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: theme.radius, paddingHorizontal: 12, height: 74, marginBottom: 12 },
  goalCardMuted: { opacity: 0.45 },
  leftIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accent, marginRight: 12 },
  leftIconImage: { width: 34, height: 34, alignSelf: "center", marginTop: 5 },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: "900", color: theme.text },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "800", color: theme.text2 },
  rightWrap: { flexDirection: "row", alignItems: "center", minWidth: 44 },
  streakText: { fontSize: 13, fontWeight: "900", color: theme.accent, marginRight: 10 },
  droplet: { width: 22, height: 22, borderRadius: 11 },
  dropletOutline: { borderWidth: 2, borderColor: theme.accent },
  dropletFilled: { backgroundColor: theme.accent },
  empty: { textAlign: "center", color: theme.surface, fontWeight: "900", marginTop: 40 },
});
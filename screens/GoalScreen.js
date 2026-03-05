// screens/GoalScreen.js
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals } from "../components/GoalsStore";

// FIREBASE IMPORTS
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function GoalScreen({ route, navigation }) {
  const { goalId } = route.params || {};
  const { selectedDateKey } = useGoals(); // We still need this for the date display

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase for this specific goal
  useEffect(() => {
    console.log("--- FETCHING FROM FIREBASE ---");
    console.log("Looking for Goal ID:", goalId);

    if (!auth.currentUser) {
      console.log("User is not logged in!");
      setLoading(false);
      return;
    }

    // Path: users -> [userId] -> goals -> [goalId]
    const goalRef = doc(db, "users", auth.currentUser.uid, "goals", goalId);
    
    const unsubscribe = onSnapshot(goalRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("Goal found in Firebase!");
        setGoal({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("Goal document does not exist in Firebase!");
        setGoal(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [goalId]);

  if (loading) {
    return (
      <Page>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </Page>
    );
  }

  if (!goal) {
    return (
      <Page>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.centerWrap}>
          <Text style={styles.empty}>Goal not found in Database</Text>
        </View>
      </Page>
    );
  }

  // Calculate current progress
  const isCompletion = goal.type === "completion";
  const currentValue = isCompletion
    ? (goal.logs?.completion?.[selectedDateKey]?.done ? 1 : 0)
    : (goal.logs?.quantity?.[selectedDateKey]?.value ?? 0);
    
  const targetValue = isCompletion ? 1 : (goal.measurable?.target ?? 0);
  const unit = isCompletion ? "" : (goal.measurable?.unit ?? "");
  const isDone = currentValue >= targetValue && targetValue > 0;

  return (
    <Page>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Goal Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon} />
        <Text style={styles.heroTitle}>{goal.name}</Text>
        <Text style={styles.heroSub}>{goal.frequencyLabel}</Text>
        {goal.currentStreak > 0 && (
          <Text style={styles.streakText}>🔥 {goal.currentStreak} Day Streak</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress for {selectedDateKey}</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressValue}>
              {currentValue} / {targetValue} {unit}
            </Text>
            <Text style={styles.progressStatus}>
              {isDone ? "Completed! 🎉" : "In Progress"}
            </Text>
          </View>
          <View style={[styles.statusIndicator, isDone && styles.statusIndicatorDone]} />
        </View>
      </View>

      {(goal.plan?.when || goal.plan?.where) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Plan</Text>
          <View style={styles.planCard}>
            {!!goal.plan?.when && (
              <Text style={styles.planText}>
                <Text style={styles.planLabel}>When: </Text>{goal.plan.when}
              </Text>
            )}
            {!!goal.plan?.where && (
              <Text style={[styles.planText, { marginTop: 8 }]}>
                <Text style={styles.planLabel}>Where: </Text>{goal.plan.where}
              </Text>
            )}
          </View>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backText: { fontSize: 16, fontWeight: "800", color: theme.accent, width: 50 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: theme.text },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 16, fontWeight: "800", color: theme.muted },
  heroCard: { alignItems: "center", backgroundColor: theme.card, borderRadius: theme.radius, padding: 24, marginBottom: 24 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.accent, marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: theme.text, textAlign: "center" },
  heroSub: { marginTop: 4, fontSize: 14, fontWeight: "800", color: theme.text2 },
  streakText: { marginTop: 8, fontSize: 16, fontWeight: "900", color: theme.accent },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: theme.muted, marginBottom: 8, marginLeft: 4 },
  progressCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surface, borderRadius: theme.radiusSm, padding: 16 },
  progressInfo: { flex: 1 },
  progressValue: { fontSize: 18, fontWeight: "900", color: theme.text },
  progressStatus: { marginTop: 4, fontSize: 14, fontWeight: "800", color: theme.text2 },
  statusIndicator: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.accent },
  statusIndicatorDone: { backgroundColor: theme.accent },
  planCard: { backgroundColor: theme.surface, borderRadius: theme.radiusSm, padding: 16 },
  planText: { fontSize: 15, fontWeight: "800", color: theme.text },
  planLabel: { color: theme.muted },
});
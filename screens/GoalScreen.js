import React, { useState, useEffect, useMemo, memo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  Modal, 
  TextInput, 
  FlatList 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals } from "../components/GoalsStore";
import { doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// --- ICON DATA ---
const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const allIconNames = Object.keys(glyphMap).sort();

const IconItem = memo(({ iconName, onSelect }) => (
  <Pressable onPress={() => onSelect(iconName)} style={styles.modalIconBox}>
    <Ionicons name={iconName} size={28} color={theme.text} />
  </Pressable>
));

export default function GoalScreen({ route, navigation }) {
  const { goalId } = route.params || {};
  const { selectedDateKey } = useGoals();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!auth.currentUser || !goalId) {
      setLoading(false);
      return;
    }
    const goalRef = doc(db, "users", auth.currentUser.uid, "goals", goalId);
    const unsubscribe = onSnapshot(goalRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoal({ id: docSnap.id, ...docSnap.data() });
      } else {
        setGoal(null);
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [goalId]);

  // --- THE FIX: FORCED NAVIGATION ---
  const handleBack = () => {
    // This resets the navigation state to exactly the 'Goals' tab.
    // This bypasses the default "first tab" behavior that leads to RankScreen.
    navigation.reset({
      index: 0,
      routes: [{ name: 'Goals' }],
    });
  };

  const confirmDelete = () => {
    Alert.alert("Delete Goal", "Are you sure? This will remove all progress and history for this plant.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteGoal },
    ]);
  };

  const deleteGoal = async () => {
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "goals", goalId));
      handleBack(); 
    } catch (e) {
      Alert.alert("Error", "Could not delete goal.");
    }
  };

  const updateIcon = async (newIcon) => {
    try {
      const goalRef = doc(db, "users", auth.currentUser.uid, "goals", goalId);
      await updateDoc(goalRef, { icon: newIcon });
      setShowIconPicker(false);
    } catch (e) {
      Alert.alert("Error", "Could not update icon.");
    }
  };

  const filteredIcons = useMemo(() => {
    const clean = searchTerm.toLowerCase().trim();
    if (!clean) return allIconNames.slice(0, 100);
    return allIconNames.filter(n => n.toLowerCase().includes(clean)).slice(0, 100);
  }, [searchTerm]);

  if (loading) return <Page><View style={styles.centerWrap}><ActivityIndicator size="large" color={theme.accent} /></View></Page>;
  if (!goal) return <Page><View style={styles.centerWrap}><Text style={styles.empty}>Goal not found</Text><Pressable onPress={handleBack}><Text style={styles.backLink}>Go Back</Text></Pressable></View></Page>;

  const isCompletion = goal.type === "completion";
  const currentValue = isCompletion
    ? (goal.logs?.completion?.[selectedDateKey]?.done ? 1 : 0)
    : (goal.logs?.quantity?.[selectedDateKey]?.value ?? 0);
    
  const targetValue = isCompletion ? 1 : (goal.measurable?.target ?? 0);
  const isDone = currentValue >= targetValue && targetValue > 0;

  return (
    <Page>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack} hitSlop={20} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.accent} />
        </Pressable>
        <Text style={styles.headerTitle}>Goal Details</Text>
        <Pressable onPress={confirmDelete} hitSlop={20} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={22} color={theme.dangerText || "#ff4444"} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Pressable onPress={() => setShowIconPicker(true)} style={styles.heroIconWrap}>
            <Ionicons name={goal.icon || "leaf"} size={40} color="#FFF" />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={10} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.heroTitle}>{goal.name}</Text>
          <Text style={styles.heroSub}>{goal.frequencyLabel}</Text>
          {goal.currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {goal.currentStreak} Day Streak</Text>
            </View>
          )}
        </View>

        {/* Daily Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Progress</Text>
          <View style={styles.progressCard}>
            <View>
              <Text style={styles.progressValue}>{currentValue} / {targetValue} {goal.measurable?.unit || ""}</Text>
              <Text style={styles.progressStatus}>{isDone ? "Goal Reached! ✨" : "In Progress"}</Text>
            </View>
            <View style={[styles.statusCircle, isDone && styles.statusCircleDone]}>
              {isDone && <Ionicons name="checkmark" size={20} color="#FFF" />}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Logs</Text>
              <Text style={styles.statValue}>{goal.totalCompletions || 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Health</Text>
              <Text style={styles.statValue}>❤️ {goal.healthLevel || 5}/5</Text>
            </View>
          </View>
        </View>

        {/* Plan */}
        {(goal.plan?.when || goal.plan?.where) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The Plan</Text>
            <View style={styles.planCard}>
              {!!goal.plan?.when && <Text style={styles.planItem}><Text style={styles.mutedLabel}>When: </Text>{goal.plan.when}</Text>}
              {!!goal.plan?.where && <Text style={styles.planItem}><Text style={styles.mutedLabel}>Where: </Text>{goal.plan.where}</Text>}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ICON PICKER MODAL */}
      <Modal visible={showIconPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Icon</Text>
              <Pressable onPress={() => setShowIconPicker(false)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            <TextInput 
              placeholder="Search icons..." 
              style={styles.modalSearch} 
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredIcons}
              numColumns={4}
              keyExtractor={item => item}
              renderItem={({ item }) => <IconItem iconName={item} onSelect={updateIcon} />}
              contentContainerStyle={styles.modalGrid}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 15 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: theme.text },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroCard: { alignItems: "center", backgroundColor: theme.surface, borderRadius: theme.radius, padding: 30, marginBottom: 20 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.text, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.surface },
  heroTitle: { fontSize: 22, fontWeight: "900", color: theme.text },
  heroSub: { fontSize: 14, fontWeight: "700", color: theme.muted, marginTop: 4 },
  streakBadge: { marginTop: 12, backgroundColor: theme.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 14, fontWeight: "900", color: theme.accent },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "900", color: theme.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  progressCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surface, padding: 20, borderRadius: theme.radius },
  progressValue: { fontSize: 20, fontWeight: "900", color: theme.text },
  progressStatus: { fontSize: 14, fontWeight: "700", color: theme.muted, marginTop: 2 },
  statusCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  statusCircleDone: { backgroundColor: theme.accent },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: theme.surface, padding: 16, borderRadius: theme.radius },
  statLabel: { fontSize: 12, fontWeight: '700', color: theme.muted, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900', color: theme.text },
  planCard: { backgroundColor: theme.surface, padding: 16, borderRadius: theme.radius },
  planItem: { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 4 },
  mutedLabel: { color: theme.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.bg, height: '70%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text },
  modalSearch: { backgroundColor: theme.surface, borderRadius: 12, padding: 12, color: theme.text, marginBottom: 15 },
  modalGrid: { paddingBottom: 30 },
  modalIconBox: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  backLink: { marginTop: 10, color: theme.accent, fontWeight: '800' }
});
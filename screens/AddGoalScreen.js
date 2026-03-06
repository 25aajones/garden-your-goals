// screens/AddGoalScreen.js
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  UIManager,
  findNodeHandle,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Ensure this is installed
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals, fromKey } from "../components/GoalsStore";

// FIREBASE IMPORTS
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// --- 1. ICON CONSTANTS & HELPER ---
const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const allIconNames = Object.keys(glyphMap).sort();

const DAYS = [
  { label: "Sun", day: 0 },
  { label: "Mon", day: 1 },
  { label: "Tue", day: 2 },
  { label: "Wed", day: 3 },
  { label: "Thu", day: 4 },
  { label: "Fri", day: 5 },
  { label: "Sat", day: 6 },
];

const CATEGORIES = ["Body", "Mind", "Spirit", "Work", "Custom"];

const clampNum = (n, min, max) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
};

const mapDayShort = (d) => ["S", "M", "T", "W", "Th", "F", "Sa"][d] ?? "?";

// --- 2. OPTIMIZED ICON COMPONENT ---
const IconItem = memo(({ iconName, isActive, onSelect }) => (
  <Pressable 
    onPress={() => onSelect(iconName)} 
    style={[styles.iconBox, isActive && styles.iconBoxActive]}
  >
    <Ionicons 
      name={iconName} 
      size={24} 
      color={isActive ? "#FFFFFF" : theme.muted} 
    />
  </Pressable>
));

function measureRef(ref, cb) {
  const node = findNodeHandle(ref.current);
  if (!node) return cb(null);
  UIManager.measureInWindow(node, (x, y, width, height) => cb({ x, y, width, height }));
}

function Button({ variant = "primary", label, onPress, disabled }) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btnBase,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Text style={[styles.btnTextBase, isPrimary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Segmented({ left, right, value, onChange }) {
  return (
    <View style={styles.segmentWrap}>
      <Pressable
        onPress={() => onChange(left.value)}
        style={[styles.segment, value === left.value && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, value === left.value && styles.segmentTextActive]}>{left.label}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(right.value)}
        style={[styles.segment, value === right.value && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, value === right.value && styles.segmentTextActive]}>{right.label}</Text>
      </Pressable>
    </View>
  );
}

function ProgressDots({ total, index, done }) {
  return (
    <View style={styles.dotsRow} accessibilityRole="progressbar">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            !!done[i] && styles.dotDone,
            i === index && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

export default function AddGoalScreen({ navigation }) {
  const { selectedDateKey } = useGoals();
  const [isSaving, setIsSaving] = useState(false);

  const selectedDate = fromKey(selectedDateKey);
  const selectedDay = selectedDate.getDay();

  // Added "icon" step into the array
  const STEPS = useMemo(
    () => [
      { key: "seed", title: "Plant a goal", subtitle: "Give your goal a clear name so it’s easy to recognize." },
      { key: "icon", title: "Visual identity", subtitle: "Choose an icon to represent this goal in your garden." },
      { key: "track", title: "How will you measure growth?", subtitle: "Simple checkmark or a quantity you count." },
      { key: "schedule", title: "When will you water it?", subtitle: "Pick the days this goal shows up." },
      { key: "plan", title: "Make it easy", subtitle: "Attach it to a routine (optional, but powerful).", optional: true },
      { key: "why", title: "Why does it matter?", subtitle: "A quick reason helps on low-motivation days (optional).", optional: true },
      { key: "review", title: "Plant it", subtitle: "Review and save. You can refine later as it grows." },
    ],
    []
  );

  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [selectedIcon, setSelectedIcon] = useState("leaf"); // NEW
  const [searchTerm, setSearchTerm] = useState(""); // NEW
  const [type, setType] = useState("completion");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("times");
  const [mode, setMode] = useState("days");
  const [days, setDays] = useState([selectedDay]);
  const [whenStr, setWhenStr] = useState("");
  const [whereStr, setWhereStr] = useState("");
  const [whyStr, setWhyStr] = useState("");

  const [skipPlan, setSkipPlan] = useState(false);
  const [skipWhy, setSkipWhy] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [tutorialOn, setTutorialOn] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [spot, setSpot] = useState(null);

  const seedRef = useRef(null);
  const iconRef = useRef(null); // NEW
  const trackRef = useRef(null);
  const scheduleRef = useRef(null);
  const planRef = useRef(null);
  const whyRef = useRef(null);
  const reviewRef = useRef(null);

  // Filtered Icons Logic
  const filteredIcons = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (!cleanSearch) return allIconNames.slice(0, 500); 
    return allIconNames.filter(n => n.toLowerCase().includes(cleanSearch)).slice(0, 500);
  }, [searchTerm]);

  const tutorialSteps = useMemo(() => [
    { title: "Start with a clear name", body: "Short and recognizable.", ref: seedRef, goToStep: 0 },
    { title: "Pick an icon", body: "Something that inspires you.", ref: iconRef, goToStep: 1 },
    { title: "Choose how you’ll track it", body: "Completion is yes/no. Quantity is counting.", ref: trackRef, goToStep: 2 },
    { title: "Pick realistic days", body: "Consistency grows faster than intensity.", ref: scheduleRef, goToStep: 3 },
    { title: "Routine anchors make goals stick", body: "Optional, but effective.", ref: planRef, goToStep: 4 },
    { title: "A tiny ‘why’ keeps it alive", body: "One sentence is enough.", ref: whyRef, goToStep: 5 },
    { title: "Plant it", body: "Review and save.", ref: reviewRef, goToStep: 6 },
  ], []);

  const scheduleDays = useMemo(() => {
    if (mode === "everyday") return [0, 1, 2, 3, 4, 5, 6];
    if (mode === "weekdays") return [1, 2, 3, 4, 5];
    return days.length ? days : [selectedDay];
  }, [mode, days, selectedDay]);

  const frequencyLabel = useMemo(() => {
    if (mode === "everyday") return "Every day";
    if (mode === "weekdays") return "Weekdays";
    return [...scheduleDays].sort((a, b) => a - b).map(mapDayShort).join(" ");
  }, [mode, scheduleDays]);

  const measurableForType = useMemo(() => {
    if (type === "completion") return { target: 1, unit: "times" };
    return { target: clampNum(target, 1, 9999), unit: unit.trim() || "units" };
  }, [type, target, unit]);

  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const done = useMemo(() => {
    const m = {};
    m[0] = name.trim().length >= 3;
    m[1] = !!selectedIcon;
    m[2] = type === "completion" || (Number(target) > 0 && unit.trim().length > 0);
    m[3] = scheduleDays.length > 0;
    m[4] = skipPlan || whenStr.trim().length >= 2;
    m[5] = skipWhy || whyStr.trim().length >= 4;
    m[6] = false;
    return m;
  }, [name, selectedIcon, type, target, unit, scheduleDays, skipPlan, whenStr, skipWhy, whyStr]);

  const stepError = useMemo(() => {
    if (step === 0 && name.trim().length < 3) return "Give it a short name (at least 3 characters).";
    if (step === 1 && !selectedIcon) return "Please select an icon.";
    if (step === 2 && type === "quantity" && (!(Number(target) > 0) || unit.trim().length < 1)) return "Quantity needs a number + unit.";
    if (step === 3 && !scheduleDays.length) return "Pick at least one day.";
    if (step === 4 && !skipPlan && whenStr.trim().length < 2) return "Add a time anchor or skip.";
    if (step === 5 && !skipWhy && whyStr.trim().length < 4) return "Add a short reason or skip.";
    return "";
  }, [step, name, selectedIcon, type, target, unit, scheduleDays, skipPlan, whenStr, skipWhy, whyStr]);

  const canNext = !stepError;

  const goNext = () => {
    if (!canNext) return;
    if (step === 3 && skipPlan) return setStep(5); // Jump past Plan
    if (step === 4 && skipWhy) return setStep(6);  // Jump past Why
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goBack = () => {
    if (step === 5 && skipPlan) return setStep(3);
    if (step === 6 && skipWhy) return setStep(4);
    setStep((s) => Math.max(0, s - 1));
  };

  const save = async () => {
    if (!auth.currentUser || isSaving || !canNext) return;
    setIsSaving(true);
    try {
      const goalData = {
        name: name.trim(),
        category,
        icon: selectedIcon,
        type,
        measurable: measurableForType,
        schedule: { type: mode, days: scheduleDays },
        frequencyLabel,
        plan: { when: skipPlan ? "" : whenStr.trim(), where: whereStr.trim() },
        why: skipWhy ? "" : whyStr.trim(),
        createdAt: serverTimestamp(),
        currentStreak: 0,
        longestStreak: 0,
        healthLevel: 5,
        species: "fern"
      };

      const userGoalsRef = collection(db, "users", auth.currentUser.uid, "goals");
      const docRef = await addDoc(userGoalsRef, goalData);
      navigation.navigate("Goals", { screen: "Goal", params: { goalId: docRef.id } });
    } catch (error) {
      Alert.alert("Error", "Could not save your goal.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Page>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>{STEPS[step].title}</Text>
            <Text style={styles.hSub}>{STEPS[step].subtitle}</Text>
          </View>
        </View>

        <ProgressDots total={STEPS.length} index={step} done={done} />

        <View style={styles.contentArea}>
          {step === 0 && (
            <View ref={seedRef} collapsable={false} style={styles.card}>
              <Text style={styles.sectionLabel}>Goal name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Example: Read" placeholderTextColor={theme.muted2} style={styles.input} />
              <View style={styles.gap16} />
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.chipWrap}>
                {CATEGORIES.map((c) => (
                  <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
                ))}
              </View>
            </View>
          )}

          {step === 1 && (
            <View ref={iconRef} collapsable={false} style={[styles.card, { flex: 1 }]}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={theme.muted} />
                <TextInput 
                  value={searchTerm} 
                  onChangeText={setSearchTerm} 
                  placeholder="Search 3,000+ icons..." 
                  placeholderTextColor={theme.muted2}
                  style={styles.searchInput} 
                  autoCapitalize="none"
                />
              </View>
              <FlatList
                data={filteredIcons}
                keyExtractor={(item) => item}
                numColumns={5}
                renderItem={({ item }) => (
                  <IconItem iconName={item} isActive={selectedIcon === item} onSelect={setSelectedIcon} />
                )}
                contentContainerStyle={styles.iconGrid}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={50}
              />
            </View>
          )}

          {step === 2 && (
            <View ref={trackRef} collapsable={false} style={styles.card}>
              <Text style={styles.sectionLabel}>Tracking</Text>
              <Segmented left={{ label: "Checkmark", value: "completion" }} right={{ label: "Quantity", value: "quantity" }} value={type} onChange={setType} />
              {type === "quantity" && (
                <View style={styles.row}>
                  <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 10 }]} />
                  <TextInput value={unit} onChangeText={setUnit} placeholder="minutes" style={[styles.input, { flex: 1 }]} />
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View ref={scheduleRef} collapsable={false} style={styles.card}>
              <View style={styles.row}>
                <Chip label="Every day" active={mode === "everyday"} onPress={() => setMode("everyday")} />
                <Chip label="Weekdays" active={mode === "weekdays"} onPress={() => setMode("weekdays")} />
                <Chip label="Custom" active={mode === "days"} onPress={() => setMode("days")} />
              </View>
              {mode === "days" && (
                <View style={styles.daysGrid}>
                  {DAYS.map((d) => (
                    <Pressable key={d.label} onPress={() => toggleDay(d.day)} style={[styles.dayPill, days.includes(d.day) && styles.dayPillActive]}>
                      <Text style={[styles.dayText, days.includes(d.day) && styles.dayTextActive]}>{d.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <View style={styles.gap16} />
              <View style={styles.skipRow}>
                <Pressable onPress={() => setSkipPlan(!skipPlan)} style={[styles.skipToggle, skipPlan && styles.skipToggleOn]}>
                  <Text style={[styles.skipText, skipPlan && styles.skipTextOn]}>{skipPlan ? "Plan skipped" : "Skip plan step"}</Text>
                </Pressable>
                <Pressable onPress={() => setSkipWhy(!skipWhy)} style={[styles.skipToggle, skipWhy && styles.skipToggleOn]}>
                  <Text style={[styles.skipText, skipWhy && styles.skipTextOn]}>{skipWhy ? "Why skipped" : "Skip why step"}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 4 && (
            <View ref={planRef} collapsable={false} style={styles.card}>
              <Text style={styles.sectionLabel}>Time anchor</Text>
              <TextInput value={whenStr} onChangeText={setWhenStr} placeholder="After breakfast..." style={styles.input} />
              <View style={styles.gap16} />
              <Text style={styles.sectionLabel}>Place</Text>
              <TextInput value={whereStr} onChangeText={setWhereStr} placeholder="At home..." style={styles.input} />
              <Pressable onPress={() => { setSkipPlan(true); setStep(5); }} style={styles.inlineLink}>
                <Text style={styles.inlineLinkText}>Skip this step</Text>
              </Pressable>
            </View>
          )}

          {step === 5 && (
            <View ref={whyRef} collapsable={false} style={styles.card}>
              <Text style={styles.sectionLabel}>Your reason</Text>
              <TextInput value={whyStr} onChangeText={setWhyStr} placeholder="One sentence..." style={[styles.input, styles.textArea]} multiline />
              <Pressable onPress={() => { setSkipWhy(true); setStep(6); }} style={styles.inlineLink}>
                <Text style={styles.inlineLinkText}>Skip this step</Text>
              </Pressable>
            </View>
          )}

          {step === 6 && (
            <View ref={reviewRef} collapsable={false} style={styles.card}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Icon</Text>
                <Ionicons name={selectedIcon} size={22} color={theme.accent} />
              </View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Name</Text><Text style={styles.reviewValue}>{name}</Text></View>
              <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Schedule</Text><Text style={styles.reviewValue}>{frequencyLabel}</Text></View>
            </View>
          )}

          {!!stepError && step !== 6 && (
            <View style={styles.errorInline}>
              <Text style={styles.errorInlineText}>{stepError}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button variant="secondary" label="Back" onPress={goBack} disabled={step === 0 || isSaving} />
          <View style={{ width: 10 }} />
          <Button
            variant="primary"
            label={isSaving ? "Saving..." : step === 6 ? "Save Goal" : "Next"}
            onPress={step === 6 ? save : goNext}
            disabled={isSaving || !canNext}
          />
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  btnBase: { height: 48, borderRadius: theme.radius, alignItems: "center", justifyContent: "center", flex: 1 },
  btnPrimary: { backgroundColor: theme.text },
  btnSecondary: { backgroundColor: theme.surface },
  btnTextBase: { fontSize: 16, fontWeight: "800" },
  btnTextPrimary: { color: theme.bg },
  btnTextSecondary: { color: theme.text },
  headerRow: { flexDirection: "row", marginBottom: 10 },
  hTitle: { fontSize: 20, fontWeight: "800", color: theme.text },
  hSub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: theme.muted },
  dotsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.outline, marginRight: 8 },
  dotDone: { backgroundColor: theme.text2 },
  dotActive: { backgroundColor: theme.accent },
  contentArea: { flex: 1 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, marginBottom: 10 },
  footer: { flexDirection: "row", paddingTop: 10, paddingBottom: 6 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: theme.text, marginBottom: 6 },
  input: { backgroundColor: theme.surface2, borderRadius: theme.radius, paddingHorizontal: 14, height: 46, fontSize: 14, color: theme.text },
  textArea: { height: 96, paddingTop: 12, textAlignVertical: "top" },
  gap16: { height: 16 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: theme.radius, backgroundColor: theme.surface2, justifyContent: "center" },
  chipActive: { backgroundColor: theme.accent },
  chipText: { fontSize: 12, fontWeight: "700", color: theme.text },
  chipTextActive: { color: theme.bg },
  segmentWrap: { flexDirection: "row", backgroundColor: theme.surface2, borderRadius: theme.radius, padding: 4, marginTop: 10 },
  segment: { flex: 1, height: 40, borderRadius: theme.radius, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: theme.accent },
  segmentText: { fontSize: 12, fontWeight: "700", color: theme.text },
  segmentTextActive: { color: theme.bg },
  row: { flexDirection: "row", marginTop: 10 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  dayPill: { minWidth: 92, height: 40, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  dayPillActive: { backgroundColor: theme.accent },
  dayText: { fontSize: 12, fontWeight: "700", color: theme.text },
  dayTextActive: { color: theme.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface2, borderRadius: 12, paddingHorizontal: 12, height: 45, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.text },
  iconGrid: { paddingBottom: 20 },
  iconBox: { width: `${100 / 5}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconBoxActive: { backgroundColor: theme.accent, elevation: 4 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.surface2 },
  reviewLabel: { fontSize: 13, fontWeight: "700", color: theme.muted },
  reviewValue: { fontSize: 13, fontWeight: "800", color: theme.text },
  skipRow: { flexDirection: "row", marginTop: 12, gap: 10 },
  skipToggle: { flex: 1, height: 36, borderRadius: theme.radius, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  skipToggleOn: { backgroundColor: theme.accent },
  skipText: { fontSize: 12, fontWeight: "700", color: theme.text },
  skipTextOn: { color: theme.bg },
  inlineLink: { marginTop: 8, alignSelf: "flex-start" },
  inlineLinkText: { fontSize: 12, fontWeight: "700", color: theme.muted, textDecorationLine: "underline" },
  errorInline: { marginTop: 10, backgroundColor: theme.dangerBg, borderRadius: theme.radius, padding: 12 },
  errorInlineText: { color: theme.dangerText, fontSize: 12, fontWeight: "700" },
});
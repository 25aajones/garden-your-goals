// screens/AddGoalScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { useGoals, fromKey } from "../components/GoalsStore";

const DAYS = [
  { label: "SUN", day: 0 },
  { label: "MON", day: 1 },
  { label: "TUE", day: 2 },
  { label: "WED", day: 3 },
  { label: "THU", day: 4 },
  { label: "FRI", day: 5 },
  { label: "SAT", day: 6 },
];

const SMART_STEPS = [
  {
    key: "specific",
    title: "S — Specific",
    prompt: "What exactly will you do?",
    example: "Example: Read 1 chapter of a book.",
  },
  {
    key: "measurable",
    title: "M — Measurable",
    prompt: "How will you measure success?",
    example: "Example: 1 chapter per day.",
  },
  {
    key: "achievable",
    title: "A — Achievable",
    prompt: "What makes this realistic for you right now?",
    example: "Example: Start with 10 minutes, not 1 hour.",
  },
  {
    key: "relevant",
    title: "R — Relevant",
    prompt: "Why does this matter to you?",
    example: "Example: Helps me learn and stay disciplined.",
  },
  {
    key: "timeBound",
    title: "T — Time-bound",
    prompt: "By when / what timeframe?",
    example: "Example: For the next 30 days.",
  },
];

export default function AddGoalScreen({ navigation }) {
  const { addGoal, selectedDateKey } = useGoals();

  // ✅ Android-safe parse
  const selectedDate = fromKey(selectedDateKey);
  const selectedDay = selectedDate.getDay();

  // basics
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");

  const [type, setType] = useState("completion"); // completion | quantity
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("times");

  // schedule default: selected day
  const [mode, setMode] = useState("days"); // everyday | weekdays | days
  const [days, setDays] = useState([selectedDay]);

  // SMART stepper
  const [smartStep, setSmartStep] = useState(0);
  const [smart, setSmart] = useState({
    specific: "",
    measurable: "",
    achievable: "",
    relevant: "",
    timeBound: "",
  });

  // Plan
  const [whenStr, setWhenStr] = useState("");
  const [whereStr, setWhereStr] = useState("");
  const [cueStr, setCueStr] = useState("");
  const [rewardStr, setRewardStr] = useState("");

  const toggleDay = (d) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const scheduleDays = useMemo(() => {
    if (mode === "everyday") return [0, 1, 2, 3, 4, 5, 6];
    if (mode === "weekdays") return [1, 2, 3, 4, 5];
    return days.length ? days : [selectedDay];
  }, [mode, days, selectedDay]);

  const frequencyLabel = useMemo(() => {
    if (mode === "everyday") return "Everyday";
    if (mode === "weekdays") return "Weekdays";
    const map = { 0: "S", 1: "M", 2: "T", 3: "W", 4: "Th", 5: "F", 6: "Sa" };
    return [...scheduleDays].sort((a, b) => a - b).map((d) => map[d]).join("");
  }, [mode, scheduleDays]);

  const measurableForType = useMemo(() => {
    if (type === "completion") return { target: 1, unit: "times" };
    return { target: Number(target) || 1, unit: unit.trim() || "units" };
  }, [type, target, unit]);

  // Good default: if user selects quantity, pre-fill measurable SMART step
  const smartMeasurableAutofill = useMemo(() => {
    if (type === "quantity") return `${measurableForType.target} ${measurableForType.unit}`;
    return "Complete it";
  }, [type, measurableForType]);

  const validation = useMemo(() => {
    if (name.trim().length < 3) return "Name is too short.";
    if (type === "quantity" && (!(Number(target) > 0) || unit.trim().length < 1)) return "Quantity needs target + unit.";
    if (smart.specific.trim().length < 6) return "Finish SMART: Specific.";
    if ((smart.measurable || smartMeasurableAutofill).trim().length < 2) return "Finish SMART: Measurable.";
    if (whenStr.trim().length < 2) return "Add a simple 'When' (ex: Morning).";
    return "";
  }, [name, type, target, unit, smart, whenStr, smartMeasurableAutofill]);

  const save = () => {
    if (validation) return;

    const id = addGoal({
      name,
      category,
      type,
      measurable: measurableForType,
      schedule: { type: mode, days: scheduleDays },
      frequencyLabel,
      smart: {
        specific: smart.specific,
        measurable: smart.measurable.trim() ? smart.measurable : smartMeasurableAutofill,
        achievable: smart.achievable,
        relevant: smart.relevant,
        timeBound: smart.timeBound,
      },
      plan: { when: whenStr, where: whereStr, cue: cueStr, reward: rewardStr },
      timeBound: { enabled: false, startDate: null, endDate: null },
    });

    navigation.navigate("Goals", { screen: "Goal", params: { goalId: id } });
  };

  const step = SMART_STEPS[smartStep];
  const stepValue = smart[step.key];

  return (
    <Page>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Add Goal</Text>
          <View style={styles.headerIcons}>
            <View style={styles.headerIcon} />
            <View style={styles.headerIcon} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basics */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basics</Text>

            <Text style={styles.label}>Goal Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New Goal"
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
            <View style={styles.rowWrap}>
              {["Body", "Mind", "Spirit", "Work", "Custom"].map((c) => {
                const active = category === c;
                return (
                  <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Type</Text>
            <View style={styles.row}>
              <Pressable onPress={() => setType("completion")} style={[styles.segment, type === "completion" && styles.segmentActive]}>
                <Text style={[styles.segmentText, type === "completion" && styles.segmentTextActive]}>Completion</Text>
              </Pressable>
              <View style={{ width: 10 }} />
              <Pressable onPress={() => setType("quantity")} style={[styles.segment, type === "quantity" && styles.segmentActive]}>
                <Text style={[styles.segmentText, type === "quantity" && styles.segmentTextActive]}>Quantity</Text>
              </Pressable>
            </View>

            {type === "quantity" && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Target</Text>
                <View style={styles.row}>
                  <TextInput
                    value={target}
                    onChangeText={setTarget}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={theme.muted2}
                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                  />
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="cups"
                    placeholderTextColor={theme.muted2}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
              </>
            )}
          </View>

          {/* Schedule */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <View style={styles.row}>
              {[
                { key: "everyday", label: "Everyday" },
                { key: "weekdays", label: "Weekdays" },
                { key: "days", label: "Custom" },
              ].map((opt, i) => (
                <React.Fragment key={opt.key}>
                  {i > 0 && <View style={{ width: 10 }} />}
                  <Pressable onPress={() => setMode(opt.key)} style={[styles.segment, mode === opt.key && styles.segmentActive]}>
                    <Text style={[styles.segmentText, mode === opt.key && styles.segmentTextActive]}>{opt.label}</Text>
                  </Pressable>
                </React.Fragment>
              ))}
            </View>

            {mode === "days" && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.helper}>Choose days</Text>
                <View style={styles.dayRow}>
                  {DAYS.map((d) => {
                    const active = days.includes(d.day);
                    return (
                      <Pressable
                        key={d.label}
                        onPress={() => toggleDay(d.day)}
                        style={[styles.dayPill, active && styles.dayPillActive]}
                      >
                        <Text style={[styles.dayText, active && styles.dayTextActive]}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewValue}>{frequencyLabel}</Text>
            </View>
          </View>

          {/* SMART Stepper */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>SMART Builder</Text>

            <View style={styles.smartHeaderRow}>
              {SMART_STEPS.map((s, idx) => {
                const active = idx === smartStep;
                const completed = (smart[s.key] || "").trim().length >= 2;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setSmartStep(idx)}
                    style={[
                      styles.smartDot,
                      active && styles.smartDotActive,
                      completed && styles.smartDotDone,
                    ]}
                  />
                );
              })}
            </View>

            <Text style={styles.smartTitle}>{step.title}</Text>
            <Text style={styles.helper}>{step.prompt}</Text>
            <Text style={[styles.helper, { marginTop: 6 }]}>{step.example}</Text>

            <TextInput
              value={stepValue}
              onChangeText={(txt) => setSmart((prev) => ({ ...prev, [step.key]: txt }))}
              placeholder="Write your answer…"
              placeholderTextColor={theme.muted2}
              style={styles.textArea}
              multiline
            />

            {step.key === "measurable" && !smart.measurable.trim() && (
              <View style={styles.autoHint}>
                <Text style={styles.autoHintText}>
                  Auto suggestion: {smartMeasurableAutofill}
                </Text>
                <Pressable onPress={() => setSmart((p) => ({ ...p, measurable: smartMeasurableAutofill }))} style={styles.autoBtn}>
                  <Text style={styles.autoBtnText}>Use</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.smartNavRow}>
              <Pressable
                onPress={() => setSmartStep((s) => Math.max(0, s - 1))}
                style={[styles.secondaryBtn, smartStep === 0 && { opacity: 0.5 }]}
                disabled={smartStep === 0}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </Pressable>

              <Pressable
                onPress={() => setSmartStep((s) => Math.min(SMART_STEPS.length - 1, s + 1))}
                style={[styles.secondaryBtn, smartStep === SMART_STEPS.length - 1 && { opacity: 0.5 }]}
                disabled={smartStep === SMART_STEPS.length - 1}
              >
                <Text style={styles.secondaryText}>Next</Text>
              </Pressable>
            </View>
          </View>

          {/* Plan */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Plan</Text>

            <Text style={styles.label}>When</Text>
            <TextInput
              value={whenStr}
              onChangeText={setWhenStr}
              placeholder="Morning, after class, 9:00 PM..."
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Where</Text>
            <TextInput
              value={whereStr}
              onChangeText={setWhereStr}
              placeholder="Desk, gym, library..."
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Cue</Text>
            <TextInput
              value={cueStr}
              onChangeText={setCueStr}
              placeholder="After brushing teeth..."
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Reward</Text>
            <TextInput
              value={rewardStr}
              onChangeText={setRewardStr}
              placeholder="Tea, 5 min break..."
              placeholderTextColor={theme.muted2}
              style={styles.input}
            />
          </View>

          {!!validation && (
            <View style={styles.warnCard}>
              <Text style={styles.warnTitle}>Fix this before saving</Text>
              <Text style={styles.warnText}>{validation}</Text>
            </View>
          )}

          <Pressable style={[styles.saveBtn, !!validation && { opacity: 0.6 }]} onPress={save}>
            <Text style={styles.saveText}>Save Goal</Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: theme.title },
  headerIcons: { flexDirection: "row" },
  headerIcon: { width: 18, height: 18, borderRadius: 6, backgroundColor: theme.surface, marginLeft: 10 },

  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: theme.title2, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "900", color: theme.title2, marginBottom: 8 },
  helper: { fontSize: 12, fontWeight: "800", color: theme.muted, lineHeight: 16 },

  input: {
    backgroundColor: theme.surface2,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
  textArea: {
    marginTop: 12,
    backgroundColor: theme.surface2,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 92,
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },

  row: { flexDirection: "row" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },

  segment: { flex: 1, height: 40, borderRadius: theme.radius, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: theme.accent },
  segmentText: { fontSize: 12, fontWeight: "900", color: theme.text },
  segmentTextActive: { color: theme.bg },

  chip: { paddingHorizontal: 12, height: 34, borderRadius: theme.radius, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", marginRight: 10, marginBottom: 10 },
  chipActive: { backgroundColor: theme.accent },
  chipText: { fontSize: 12, fontWeight: "900", color: theme.text },
  chipTextActive: { color: theme.bg },

  dayRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  dayPill: { width: 42, height: 40, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  dayPillActive: { backgroundColor: theme.accent },
  dayText: { fontSize: 10, fontWeight: "900", color: theme.text },
  dayTextActive: { color: theme.bg },

  previewRow: { marginTop: 16, backgroundColor: theme.surface2, borderRadius: theme.radius, paddingHorizontal: 14, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewLabel: { fontWeight: "900", color: theme.text, fontSize: 12 },
  previewValue: { fontWeight: "900", color: theme.muted, fontSize: 12 },

  // SMART stepper
  smartHeaderRow: { flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 12 },
  smartDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.outline, marginRight: 8 },
  smartDotActive: { backgroundColor: theme.accent },
  smartDotDone: { backgroundColor: theme.text2 },

  smartTitle: { fontSize: 12, fontWeight: "900", color: theme.title2 },

  autoHint: {
    marginTop: 10,
    backgroundColor: theme.surface2,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  autoHintText: { fontWeight: "800", color: theme.muted, flex: 1, paddingRight: 10 },
  autoBtn: { backgroundColor: theme.accent, borderRadius: theme.radiusSm, paddingHorizontal: 12, paddingVertical: 8 },
  autoBtnText: { color: theme.bg, fontWeight: "900" },

  smartNavRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: theme.radius, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontWeight: "900", color: theme.text },
  warnCard: { backgroundColor: theme.dangerBg, borderRadius: theme.radius, padding: 14, marginBottom: 12 },
  warnTitle: { fontWeight: "900", color: theme.dangerText },
  warnText: { marginTop: 6, fontWeight: "800", color: theme.dangerText, lineHeight: 16 },

  saveBtn: { height: 48, borderRadius: theme.radius, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  saveText: { color: theme.bg, fontWeight: "900", fontSize: 14 },

  cancelBtn: { marginTop: 12, height: 46, borderRadius: theme.radius, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  cancelText: { color: theme.title2, fontWeight: "900", fontSize: 14 },
});

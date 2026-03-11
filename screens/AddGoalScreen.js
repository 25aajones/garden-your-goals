// screens/AddGoalScreen.js
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  LayoutAnimation,
  KeyboardAvoidingView,
  Platform,
  Alert,
  UIManager,
  findNodeHandle,
  Dimensions,
  ScrollView,
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

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysISO = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const addYearsISO = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return toISODate(date);
};

const formatDateInput = (text) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

const isValidISODate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

const toStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const monthLabel = (date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayWeekIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayWeekIndex; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length < 42) cells.push(null);
  return cells;
};

const mapDayShort = (d) => ["S", "M", "T", "W", "Th", "F", "Sa"][d] ?? "?";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [selectedIcon, setSelectedIcon] = useState("leaf");
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("completion");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("times");
  const [mode, setMode] = useState("days");
  const [days, setDays] = useState([selectedDay]);
  const [whenStr, setWhenStr] = useState("");
  const [whereStr, setWhereStr] = useState("");
  const [whyStr, setWhyStr] = useState("");
  const [completionMode, setCompletionMode] = useState("none");
  const [completionEndDate, setCompletionEndDate] = useState("");
  const [completionEndAmount, setCompletionEndAmount] = useState("");
  const [completionEndUnit, setCompletionEndUnit] = useState("times");
  const [calendarMonth, setCalendarMonth] = useState(toStartOfDay(new Date()));
  const [calendarWidth, setCalendarWidth] = useState(0);
  const calendarPagerRef = useRef(null);

  // Filtered Icons Logic
  const filteredIcons = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (!cleanSearch) return allIconNames.slice(0, 500); 
    return allIconNames.filter(n => n.toLowerCase().includes(cleanSearch)).slice(0, 500);
  }, [searchTerm]);

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

  const completionCondition = useMemo(() => {
    if (completionMode === "date" && isValidISODate(completionEndDate.trim())) {
      return { type: "date", endDate: completionEndDate.trim() };
    }
    if (completionMode === "amount" && Number(completionEndAmount) > 0) {
      return {
        type: "amount",
        targetAmount: clampNum(completionEndAmount, 1, 999999),
        unit: completionEndUnit.trim() || "times",
      };
    }
    if (
      completionMode === "both" &&
      isValidISODate(completionEndDate.trim()) &&
      Number(completionEndAmount) > 0
    ) {
      return {
        type: "both",
        endDate: completionEndDate.trim(),
        targetAmount: clampNum(completionEndAmount, 1, 999999),
        unit: completionEndUnit.trim() || "times",
      };
    }
    return { type: "none" };
  }, [completionMode, completionEndDate, completionEndAmount, completionEndUnit]);

  const completionDateMeta = useMemo(() => {
    if (!isValidISODate(completionEndDate.trim())) return null;
    const [year, month, day] = completionEndDate.trim().split("-").map(Number);
    const endDate = new Date(year, month - 1, day);
    const today = toStartOfDay(new Date());
    const endStart = toStartOfDay(endDate);
    const daysLeft = Math.round((endStart.getTime() - today.getTime()) / 86400000);

    return {
      readable: endDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      daysLeft,
    };
  }, [completionEndDate]);

  const calendarCells = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const prevMonth = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    [calendarMonth]
  );
  const nextMonth = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    [calendarMonth]
  );
  const prevMonthCells = useMemo(() => buildMonthGrid(prevMonth), [prevMonth]);
  const nextMonthCells = useMemo(() => buildMonthGrid(nextMonth), [nextMonth]);

  useEffect(() => {
    if (isValidISODate(completionEndDate.trim())) {
      const [year, month] = completionEndDate.trim().split("-").map(Number);
      setCalendarMonth(new Date(year, month - 1, 1));
    }
  }, [completionEndDate]);

  useEffect(() => {
    if (!calendarWidth || !calendarPagerRef.current) return;
    calendarPagerRef.current.scrollTo({ x: calendarWidth, animated: false });
  }, [calendarWidth, calendarMonth]);

  const selectCalendarDay = (day) => {
    if (!day) return;
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setCompletionEndDate(toISODate(date));
  };

  const goPrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const changeCompletionMode = (nextMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCompletionMode(nextMode);
  };

  const handleCalendarScrollEnd = (event) => {
    if (!calendarWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / calendarWidth);
    if (pageIndex === 0) {
      goPrevMonth();
    } else if (pageIndex === 2) {
      goNextMonth();
    }
  };

  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const formError = useMemo(() => {
    if (name.trim().length < 3) return "Give it a short name (at least 3 characters).";
    if (!selectedIcon) return "Please select an icon.";
    if (type === "quantity" && (!(Number(target) > 0) || unit.trim().length < 1)) return "Quantity needs a number + unit.";
    if (!scheduleDays.length) return "Pick at least one day.";
    if ((completionMode === "date" || completionMode === "both") && !isValidISODate(completionEndDate.trim())) {
      return "Enter a valid end date (YYYY-MM-DD).";
    }
    if ((completionMode === "date" || completionMode === "both") && completionDateMeta && completionDateMeta.daysLeft < 0) {
      return "End date cannot be in the past.";
    }
    if ((completionMode === "amount" || completionMode === "both") && !(Number(completionEndAmount) > 0)) {
      return "End amount must be greater than 0.";
    }
    return "";
  }, [name, selectedIcon, type, target, unit, scheduleDays, completionMode, completionEndDate, completionDateMeta, completionEndAmount]);

  const canSave = !formError;

  const save = async () => {
    if (!auth.currentUser || isSaving || !canSave) return;
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
        completionCondition,
        plan: { when: whenStr.trim(), where: whereStr.trim() },
        why: whyStr.trim(),
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
            <Text style={styles.hTitle}>Plant a goal</Text>
            <Text style={styles.hSub}>Fill out your goal details below.</Text>
          </View>
        </View>

        <ScrollView style={styles.contentArea} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
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

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Icon</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={theme.muted} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search icons..."
                placeholderTextColor={theme.muted2}
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>
            <ScrollView
              style={styles.iconList}
              contentContainerStyle={styles.iconGrid}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconGridWrap}>
                {filteredIcons.map((item) => (
                  <IconItem key={item} iconName={item} isActive={selectedIcon === item} onSelect={setSelectedIcon} />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Tracking</Text>
            <Segmented left={{ label: "Checkmark", value: "completion" }} right={{ label: "Quantity", value: "quantity" }} value={type} onChange={setType} />
            {type === "quantity" && (
              <View style={styles.row}>
                <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 10 }]} />
                <TextInput value={unit} onChangeText={setUnit} placeholder="minutes" style={[styles.input, { flex: 1 }]} />
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Schedule</Text>
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
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Plan (optional)</Text>
            <TextInput value={whenStr} onChangeText={setWhenStr} placeholder="After breakfast..." style={styles.input} />
            <View style={styles.gap16} />
            <TextInput value={whereStr} onChangeText={setWhereStr} placeholder="At home..." style={styles.input} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Why (optional)</Text>
            <TextInput value={whyStr} onChangeText={setWhyStr} placeholder="One sentence..." style={[styles.input, styles.textArea]} multiline />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Goal completion</Text>
            <View style={styles.completionModeRow}>
              <Chip label="No end" active={completionMode === "none"} onPress={() => changeCompletionMode("none")} />
              <Chip label="End date" active={completionMode === "date"} onPress={() => changeCompletionMode("date")} />
              <Chip label="End amount" active={completionMode === "amount"} onPress={() => changeCompletionMode("amount")} />
              <Chip label="Both" active={completionMode === "both"} onPress={() => changeCompletionMode("both")} />
            </View>

            {(completionMode === "date" || completionMode === "both") && (
              <>
                <Text style={styles.helperText}>Swipe the calendar left/right to move by month.</Text>
                <View style={styles.calendarCard}>
                  <ScrollView
                    ref={calendarPagerRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onLayout={(e) => setCalendarWidth(e.nativeEvent.layout.width)}
                    onMomentumScrollEnd={handleCalendarScrollEnd}
                    scrollEventThrottle={16}
                  >
                    {[{ month: prevMonth, cells: prevMonthCells }, { month: calendarMonth, cells: calendarCells }, { month: nextMonth, cells: nextMonthCells }].map((entry, pageIdx) => (
                      <View key={`${entry.month.getFullYear()}-${entry.month.getMonth()}-${pageIdx}`} style={[styles.calendarPage, { width: calendarWidth || undefined }]}> 
                        <View style={styles.calendarHeader}>
                          <Text style={styles.calendarHeaderText}>{monthLabel(entry.month)}</Text>
                        </View>

                        <View style={styles.calendarWeekHeader}>
                          {WEEKDAY_LABELS.map((label, idx) => (
                            <Text key={`${label}-${idx}`} style={styles.calendarWeekHeaderText}>{label}</Text>
                          ))}
                        </View>

                        <View style={styles.calendarGrid}>
                          {entry.cells.map((day, idx) => {
                            const dayDate = day
                              ? new Date(entry.month.getFullYear(), entry.month.getMonth(), day)
                              : null;
                            const todayStart = toStartOfDay(new Date());
                            const isToday = !!dayDate && toStartOfDay(dayDate).getTime() === todayStart.getTime();
                            const isPast = !!dayDate && toStartOfDay(dayDate).getTime() < todayStart.getTime();
                            const isSelected =
                              !!day &&
                              completionEndDate ===
                                toISODate(new Date(entry.month.getFullYear(), entry.month.getMonth(), day));

                            return (
                              <Pressable
                                key={`${pageIdx}-${idx}-${day || "blank"}`}
                                onPress={() => day && setCompletionEndDate(toISODate(new Date(entry.month.getFullYear(), entry.month.getMonth(), day)))}
                                disabled={!day}
                                style={[
                                  styles.calendarCell,
                                  isPast && styles.calendarCellPast,
                                  isToday && styles.calendarCellToday,
                                  isSelected && styles.calendarCellSelected,
                                  !day && styles.calendarCellEmpty,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.calendarCellText,
                                    isPast && styles.calendarCellTextPast,
                                    isSelected && styles.calendarCellTextSelected,
                                  ]}
                                >
                                  {day || ""}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <TextInput
                  value={completionEndDate}
                  onChangeText={(text) => setCompletionEndDate(formatDateInput(text))}
                  placeholder="YYYY-MM-DD"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[styles.input, styles.completionInput]}
                />
                {!!completionDateMeta && (
                  <View style={styles.datePreviewBox}>
                    <Text style={styles.datePreviewText}>
                      Ends {completionDateMeta.readable}
                      {completionDateMeta.daysLeft === 0
                        ? " (today)"
                        : completionDateMeta.daysLeft > 0
                        ? ` (${completionDateMeta.daysLeft} days left)`
                        : ` (${Math.abs(completionDateMeta.daysLeft)} days ago)`}
                    </Text>
                  </View>
                )}
              </>
            )}

            {(completionMode === "amount" || completionMode === "both") && (
              <View style={styles.row}>
                <TextInput
                  value={completionEndAmount}
                  onChangeText={setCompletionEndAmount}
                  keyboardType="numeric"
                  placeholder="Total amount"
                  style={[styles.input, styles.completionInput, { flex: 1, marginRight: 10 }]}
                />
                <TextInput
                  value={completionEndUnit}
                  onChangeText={setCompletionEndUnit}
                  placeholder="times"
                  style={[styles.input, styles.completionInput, { flex: 1 }]}
                />
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Icon</Text><Ionicons name={selectedIcon} size={22} color={theme.accent} /></View>
            <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Name</Text><Text style={styles.reviewValue}>{name || "—"}</Text></View>
            <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Schedule</Text><Text style={styles.reviewValue}>{frequencyLabel}</Text></View>
          </View>

          {!!formError && (
            <View style={styles.errorInline}>
              <Text style={styles.errorInlineText}>{formError}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button variant="secondary" label="Cancel" onPress={() => navigation.goBack()} disabled={isSaving} />
          <View style={{ width: 10 }} />
          <Button
            variant="primary"
            label={isSaving ? "Saving..." : "Save Goal"}
            onPress={save}
            disabled={isSaving || !canSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    height: 50,
    borderRadius: theme.radius,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnPrimary: {
    backgroundColor: theme.text,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  btnSecondary: { backgroundColor: theme.surface, borderColor: theme.outline },
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
  formScrollContent: { paddingBottom: 12 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, marginBottom: 10 },
  footer: { flexDirection: "row", paddingTop: 10, paddingBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: theme.text, marginBottom: 6 },
  helperText: { fontSize: 12, color: theme.muted, marginBottom: 8 },
  completionModeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8, marginBottom: 10 },
  calendarCard: {
    backgroundColor: theme.surface2,
    borderRadius: theme.radius,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.outline,
  },
  calendarHeader: {
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.outline,
  },
  calendarHeaderText: { fontSize: 15, fontWeight: "800", color: theme.text },
  calendarWeekHeader: { flexDirection: "row", marginBottom: 8 },
  calendarWeekHeaderText: { flex: 1, textAlign: "center", fontSize: 11, color: theme.muted, fontWeight: "700" },
  calendarPage: { paddingHorizontal: 2, minHeight: 318 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 6,
  },
  calendarCellEmpty: { opacity: 0 },
  calendarCellPast: { opacity: 0.55 },
  calendarCellToday: { borderWidth: 1, borderColor: theme.accent },
  calendarCellSelected: { backgroundColor: theme.accent, borderWidth: 0 },
  calendarCellText: { fontSize: 12, color: theme.text, fontWeight: "700" },
  calendarCellTextPast: { color: theme.muted },
  calendarCellTextSelected: { color: theme.bg },
  calendarQuickActions: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10 },
  datePreviewBox: { marginTop: 10, backgroundColor: theme.surface2, borderRadius: theme.radius, padding: 10 },
  datePreviewText: { fontSize: 12, color: theme.text, fontWeight: "700" },
  completionInput: { marginTop: 2 },
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
  iconList: { maxHeight: 260 },
  iconGrid: { paddingBottom: 20 },
  iconGridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
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
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { Dimensions } from "react-native";

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

function getWeekDays(date) {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday of current week

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push({
      day: d.getDate(),
      faded: false,
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return days;
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const arr = [];

<<<<<<< HEAD
=======
  // prev month fillers
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
  for (let i = startDay - 1; i >= 0; i--) {
    arr.push({ day: prevDays - i, faded: true });
  }

<<<<<<< HEAD
=======
  // current
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
  for (let i = 1; i <= daysInMonth; i++) {
    arr.push({ day: i, faded: false });
  }

<<<<<<< HEAD
=======
  // next fillers
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
  while (arr.length % 7 !== 0) {
    arr.push({ day: arr.length, faded: true });
  }

  return arr;
}

export default function CalendarScreen() {
  const [mode, setMode] = useState("month");
  const [date, setDate] = useState(new Date());

  const year = date.getFullYear();
  const month = date.getMonth();

  const today = new Date();
<<<<<<< HEAD
  const isCurrentMonth =
    today.getFullYear() === year &&
    today.getMonth() === month;
  const todayDay = today.getDate();

  const days = useMemo(() => {
    if (mode === "month") return getMonthDays(year, month);
    if (mode === "week") return getWeekDays(date);
    return [];
  }, [mode, year, month, date]);

  const { goals } = useGoals();

  const todaysGoals = useMemo(() => {
    return goals
      .filter(g => isWithinActiveRange(g, date))
      .filter(g => isScheduledOn(g, date));
},  [goals, selectedDateKey]);

  const monthLabel = date.toLocaleString("default", { month: "long" });

  const changeDay = (dir) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + dir);
    setSelectedDateKey(toKey(newDate));
};

  const changeWeek = (dir) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + dir * 7);
    setSelectedDateKey(toKey(newDate));
};

  const changeMonth = (dir) => {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + dir);
    setSelectedDateKey(toKey(newDate));
};

  const weekLabel = () => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString("default", {
    month: "short",
    day: "numeric"
  })} - ${end.toLocaleDateString("default", {
    month: "short",
    day: "numeric"
  })}`;
  };

  return (
    <Page>

=======

  const isCurrentMonth =
    today.getFullYear() === year &&
    today.getMonth() === month;

  const todayDay = today.getDate();

  const days = useMemo(() => {
    if (mode === "month") {
      return getMonthDays(year, month);
    } else if (mode === "week") {
      return getWeekDays(date);
  }
},    [mode, year, month, date]);


  const monthLabel = date.toLocaleString("default", { month: "long" });

  const changeMonth = (dir) => {
    setDate(new Date(year, month + dir, 1));
  };



  return (
    <Page>
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)
      {/* TOP SEGMENT */}
      <View style={styles.segmentRow}>
        {["today","week","month"].map(m => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.segmentBtn, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* CARD */}
      <View style={styles.card}>
<<<<<<< HEAD

        {/* HEADER */}
        <View style={styles.monthRow}>
         <Pressable
            onPress={() => {
              if (mode === "today") changeDay(-1);
              else if (mode === "week") changeWeek(-1);
              else changeMonth(-1);
          }}
          >
            <Text style={styles.arrow}>‹</Text>
          </Pressable>

          <Text style={styles.month}>
            {mode === "today"
              ? date.toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })
              : mode === "week"
              ? weekLabel()
              : monthLabel}
          </Text>

          <Pressable
            onPress={() => {
              if (mode === "today") changeDay(1);
              else if (mode === "week") changeWeek(1);
                >
                  {d.day}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* GOALS FOR SELECTED DAY */}
        <>
          <View style={styles.divider} />
          {todaysGoals.map((g) => (
            <View key={g.id} style={styles.goalRow}>
              <View style={styles.goalIcon} />
              <Text style={styles.goalText}>{g.name}</Text>
              <Text style={styles.check}>✓</Text>
            </View>
          ))}

          {todaysGoals.length === 0 && (
            <Text style={{ textAlign: "center", opacity: 0.6, marginTop: 10 }}>
              No goals scheduled
            </Text>
  segmentBtn:{ flex:1, height:44, alignItems:"center", justifyContent:"center", borderRadius:999 },
  segmentActive:{ backgroundColor:"#31795f" },
  segmentText:{ fontWeight:"900", color:"#F9F6EE" },
  segmentTextActive:{},

<<<<<<< HEAD
  card:{ backgroundColor:"#B9AD97", borderRadius:24, padding:16 },

  monthRow:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  month:{ fontSize:18, fontWeight:"900", color:"#000" },
  arrow:{ fontSize:22, fontWeight:"900" },

  weekRow:{ flexDirection:"row", marginBottom:10 },

  weekPill:{
    width: BOX_SIZE,
    marginRight: GRID_GAP,
    alignItems:"center",
    justifyContent:"center",
    backgroundColor:"#7C705D",
    borderRadius:6,
    paddingVertical:4
  },
  weekText:{ color:"#fff", fontWeight:"900", fontSize:12 },

  grid:{ flexDirection:"row", flexWrap:"wrap" },

  dayBox:{
    width: BOX_SIZE,
    height: BOX_SIZE,
    marginRight: GRID_GAP,
    marginBottom: GRID_GAP,
    backgroundColor:"#E6E6E6",
    borderRadius:6,
    alignItems:"center",
    justifyContent:"center"
  },

  dayFaded:{},

  dayText:{ fontWeight:"800", textAlign:"center", includeFontPadding:false, lineHeight:16 },

  todayBox:{ backgroundColor:"#31795f" },
  todayText:{ color:"#fff" },
=======
  card:{
    backgroundColor:"#B9AD97",
    borderRadius:24,
    padding:16
  },

  monthRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:10
  },
  month:{ fontSize:18, fontWeight:"900", color:"#000" },
  arrow:{ fontSize:22, fontWeight:"900" },

weekRow:{ flexDirection:"row", marginBottom:10 },

weekPill:{
  width: BOX_SIZE,
  marginRight: GRID_GAP,
  alignItems:"center",
  justifyContent:"center",
  backgroundColor:"#7C705D",
  borderRadius:6,
  paddingVertical:4
},
  weekText:{ color:"#fff", fontWeight:"900", fontSize:12 },

  grid:{ flexDirection:"row", flexWrap:"wrap"},
  dayBox:{
  width: BOX_SIZE,
  height: BOX_SIZE,
  marginRight: GRID_GAP,
  marginBottom: GRID_GAP,
  backgroundColor:"#E6E6E6",
  borderRadius:6,
  alignItems:"center",
  justifyContent:"center"
  },
  dayFaded:{},
    dayText:{ fontWeight:"800",
    textAlign:"center",
    includeFontPadding:false,
    lineHeight:16
   },
  todayBox: {
    backgroundColor: "#31795f"
  },

  todayText: {
    color: "#fff"
  },
>>>>>>> 753f5d4 (Fix swipe-to-delete, remove lock files, update delete logic, and UI improvements)

  divider:{ height:1, backgroundColor:"#ddd", marginVertical:16 },

  goalRow:{ flexDirection:"row", alignItems:"center", marginBottom:14 },
  goalIcon:{ width:44, height:44, borderRadius:14, backgroundColor:"#E6E6E6", marginRight:12 },
  goalText:{ flex:1, fontSize:16, fontWeight:"800" },
  check:{ fontSize:18 }
});
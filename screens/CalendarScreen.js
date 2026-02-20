import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Page from "../components/Page";
import { theme } from "../theme";
import { Dimensions } from "react-native";

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const arr = [];

  // prev month fillers
  for (let i = startDay - 1; i >= 0; i--) {
    arr.push({ day: prevDays - i, faded: true });
  }

  // current
  for (let i = 1; i <= daysInMonth; i++) {
    arr.push({ day: i, faded: false });
  }

  // next fillers
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

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthLabel = date.toLocaleString("default", { month: "long" });

  const changeMonth = (dir) => {
    setDate(new Date(year, month + dir, 1));
  };

  return (
    <Page>
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
        {/* MONTH HEADER */}
        <View style={styles.monthRow}>
          <Pressable onPress={() => changeMonth(-1)}>
            <Text style={styles.arrow}>‹</Text>
          </Pressable>

          <Text style={styles.month}>{monthLabel}</Text>

          <Pressable onPress={() => changeMonth(1)}>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        {/* WEEK DAYS */}
        <View style={styles.weekRow}>
        {DAYS.map((d,i) => (
            <View
            key={d}
            style={[
                styles.weekPill,
                (i+1)%7===0 && { marginRight:0 }
            ]}
            >
            <Text style={styles.weekText}>{d}</Text>
            </View>
        ))}
        </View> 

        {/* GRID */}
        <View style={styles.grid}>
          {days.map((d, i) => (
            <View
                key={i}
                style={[
                styles.dayBox,
                (i+1)%7===0 && { marginRight:0 },
                d.faded && styles.dayFaded
        ]}
>
              <Text style={[styles.dayText, d.faded && { opacity: 0.4 }]}>
                {d.day}
              </Text>
            </View>
          ))}
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* DAILY GOALS (mock like screenshot) */}
        {["Drink Water","Daily Read","Quick Run"].map((g, i) => (
          <View key={i} style={styles.goalRow}>
            <View style={styles.goalIcon} />
            <Text style={styles.goalText}>{g}</Text>
            <Text style={styles.check}>✓</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}
const GRID_GAP = 8;
const SCREEN_WIDTH = Dimensions.get("window").width;

const CARD_PADDING = 32; // card padding left+right (16 + 16)
const CARD_INNER = SCREEN_WIDTH - 32 - 32; 
// page padding (16+16) + card padding (16+16)

const BOX_SIZE = (CARD_INNER - GRID_GAP * 6) / 7;
const styles = StyleSheet.create({
  segmentRow:{
    flexDirection:"row",
    backgroundColor:"#215240",
    borderRadius:999,
    padding:4,
    marginBottom:12
  },
  segmentBtn:{ flex:1, height:44, alignItems:"center", justifyContent:"center", borderRadius:999 },
  segmentActive:{ backgroundColor:"#31795f" },
  segmentText:{ fontWeight:"900", color:"#F9F6EE" },
  segmentTextActive:{},

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

  divider:{ height:1, backgroundColor:"#ddd", marginVertical:16 },

  goalRow:{ flexDirection:"row", alignItems:"center", marginBottom:14 },
  goalIcon:{ width:44, height:44, borderRadius:14, backgroundColor:"#E6E6E6", marginRight:12 },
  goalText:{ flex:1, fontSize:16, fontWeight:"800" },
  check:{ fontSize:18 }
});
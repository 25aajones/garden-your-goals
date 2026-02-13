// screens/HomeScreen.js
import React from "react";
import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Text style={styles.empty}>Nothing Scheduled{"\n"}Yet</Text>

        <Pressable style={styles.addButton} onPress={() => navigation.navigate("Add")}>
          <Text style={styles.addText}>Add Habit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const BG = "#f3eade";
const TAN = "#b9a78f";
const TEXT = "#2f2a20";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  page: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  empty: {
    marginTop: 140,
    textAlign: "center",
    fontWeight: "900",
    color: "#6e6153",
    lineHeight: 20,
  },
  addButton: {
    marginTop: 140,
    width: 190,
    height: 46,
    borderRadius: 16,
    backgroundColor: TAN,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontWeight: "900", color: TEXT },
});

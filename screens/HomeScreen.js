// screens/HomeScreen.js
import React from "react";
import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Text style={styles.empty}>Nothing Scheduled{"\n"}Yet</Text>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate("Add")}
        >
          <Text style={styles.addText}>Add Habit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3eade" },
  page: { flex: 1, backgroundColor: "#f3eade", alignItems: "center" },
  empty: {
    marginTop: 120,
    textAlign: "center",
    fontWeight: "800",
    color: "#6e6153",
  },
  addButton: {
    marginTop: 120,
    width: 180,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#b9a78f",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontWeight: "900", color: "#2f2a20" },
});

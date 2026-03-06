// screens/RankScreen.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

export default function RankScreen({ navigation }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [])
  );

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch top 50 users ordered by overallScore descending
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("overallScore", "desc"), limit(50));
      const querySnapshot = await getDocs(q);

      const rankedUsers = querySnapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1,
        ...doc.data(),
      }));

      setLeaderboard(rankedUsers);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderRankIcon = (rank) => {
    if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
    if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
    if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
    return <Text style={styles.rankNumber}>#{rank}</Text>;
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.id === auth.currentUser?.uid;

    return (
      <TouchableOpacity 
        style={[styles.userCard, isCurrentUser && styles.currentUserCard]}
        onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.rankContainer}>
          {renderRankIcon(item.rank)}
        </View>

        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={isCurrentUser ? "#2D5A27" : theme.muted} />
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUsername]}>
            {item.username || "Unknown"} {isCurrentUser && "(You)"}
          </Text>
          <Text style={styles.streakText}>
            🔥 {item.streakCount || 0} Day Streak
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>{item.overallScore || 0}</Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Leaderboard</Text>
        <Text style={styles.headerSubtitle}>Top 50</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2D5A27" />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No ranked users yet. Be the first!</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#2D5A27" },
  headerSubtitle: { fontSize: 14, color: "#888", fontWeight: "700", marginTop: 4 },
  
  listContent: { padding: 16, paddingBottom: 40 },
  
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderBottomWidth: 4,
  },
  currentUserCard: {
    borderColor: "#2D5A27",
    backgroundColor: "#F2FBEF",
  },
  
  rankContainer: { width: 40, alignItems: "center", justifyContent: "center", marginRight: 8 },
  medal: { fontSize: 28 },
  rankNumber: { fontSize: 18, fontWeight: "900", color: "#888" },
  
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  currentUsername: { color: "#2D5A27" },
  streakText: { fontSize: 12, fontWeight: "700", color: "#FF9600" },
  
  scoreContainer: { alignItems: "flex-end", justifyContent: "center" },
  scoreNumber: { fontSize: 20, fontWeight: "900", color: "#2D5A27" },
  scoreLabel: { fontSize: 10, fontWeight: "800", color: "#888", marginTop: -2 },
  
  emptyText: { textAlign: "center", color: "#888", marginTop: 40, fontStyle: "italic" }
});
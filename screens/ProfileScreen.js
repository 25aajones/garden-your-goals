// ProfileScreen.js
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

// IMPORT YOUR ACHIEVEMENTS STORE (Adjust path if needed)
import { ACHIEVEMENTS } from "../AchievementsStore";

export default function ProfileScreen({ navigation }) {
  const [profileData, setProfileData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (auth.currentUser) {
        fetchSocialData(auth.currentUser.uid);
      }
    }, [])
  );

  const fetchSocialData = async (uid) => {
    try {
      // 1. Fetch User Profile
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      let userData = userSnap.exists() ? userSnap.data() : {};

      // 2. Fetch Goals & Calculate Score
      const goalsRef = collection(db, "users", uid, "goals");
      const goalsSnap = await getDocs(goalsRef);
      
      let calculatedScore = 0;
      goalsSnap.docs.forEach(doc => {
        const goal = doc.data();
        const currentStreak = goal.currentStreak || 0;
        const longestStreak = goal.longestStreak || 0;
        
        calculatedScore += (currentStreak * 10) + (longestStreak * 5);
      });

      // 3. Update Database if the score has changed
      if (userData.overallScore !== calculatedScore) {
        await updateDoc(userRef, { overallScore: calculatedScore });
        userData.overallScore = calculatedScore; 
      }
      
      setProfileData(userData);

      // 4. Fetch Followers
      const followersRef = collection(db, "users", uid, "followers");
      const followersSnap = await getDocs(followersRef);
      setFollowers(followersSnap.docs.map(doc => doc.data()));

      // 5. Fetch Following
      const followingRef = collection(db, "users", uid, "following");
      const followingSnap = await getDocs(followingRef);
      setFollowing(followingSnap.docs.map(doc => doc.data()));

    } catch (error) {
      console.error("Error fetching social data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#A88F6F" />
      </View>
    );
  }

  // Get the unlocked achievements array, or default to empty
  const unlockedIds = profileData?.unlockedAchievements || [];

  return (
    <ScrollView style={styles.container}>
      <View style={{ height: 40 }} />

      {/* User Info & Stats */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
           <Ionicons name="person" size={50} color={theme.muted} />
        </View>
        <Text style={styles.userName}>{profileData?.username || "User"}</Text>

        {/* Following / Followers Counters */}
        <View style={styles.socialStatsRow}>
          <View style={styles.socialStat}>
            <Text style={styles.statNumber}>{followers.length}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.socialStat}>
            <Text style={styles.statNumber}>{following.length}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
         <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Stats</Text>
        </View>
        
        <View style={styles.userRow}>
           <Text style={{fontWeight: 'bold', flex: 1}}>🏆 Overall Score</Text>
           <Text style={{fontWeight: '900', color: "#2D5A27"}}>{profileData?.overallScore || 0} pts</Text>
        </View>

        <View style={styles.userRow}>
           <Text style={{fontWeight: 'bold', flex: 1}}>🔥 Overall App Streak</Text>
           <Text>{profileData?.streakCount || 0} Days</Text>
        </View>
      </View>

      {/* --- NEW: TROPHY CASE SECTION --- */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trophy Case</Text>
        </View>

        {unlockedIds.length === 0 ? (
          <Text style={styles.emptyText}>Complete goals to start earning achievements!</Text>
        ) : (
          <View style={styles.achievementsGrid}>
            {unlockedIds.map((id, index) => {
              const ach = ACHIEVEMENTS.find(a => a.id === id);
              if (!ach) return null; // Safety check in case you delete an achievement later
              
              return (
                <View key={index} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{ach.icon}</Text>
                  <Text style={styles.achievementTitle}>{ach.title}</Text>
                  <Text style={styles.achievementDesc}>{ach.desc}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Following List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Following</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => navigation.navigate("AddFriends")}
          >
            <Text style={styles.addButtonText}>Find People +</Text>
          </TouchableOpacity>
        </View>

        {following.length === 0 ? (
          <Text style={styles.emptyText}>You aren't following anyone yet.</Text>
        ) : (
          following.map((user, index) => (
            <View key={index} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={20} color={theme.muted} />
              </View>
              <Text style={styles.listUserName}>{user.username}</Text>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Bottom padding for scrollability */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  userSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  userName: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  
  socialStatsRow: { flexDirection: "row", justifyContent: "center", width: "60%", marginBottom: 16 },
  socialStat: { alignItems: "center", marginHorizontal: 20 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#2D5A27" },
  statLabel: { fontSize: 12, color: theme.muted, fontWeight: "600" },

  logoutButton: { backgroundColor: "#A88F6F", paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  logoutButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  addButton: { backgroundColor: "#2D5A27", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  
  userRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#E0F7D4", borderRadius: 8, padding: 12, marginBottom: 8 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  listUserName: { flex: 1, marginLeft: 12, fontWeight: "700", fontSize: 16 },
  viewButton: { backgroundColor: "#A88F6F", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  viewButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  
  // NEW STYLES FOR TROPHY CASE
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  achievementCard: { 
    width: "48%", // Put two side-by-side
    backgroundColor: "#fff", 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12, 
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0F7D4" // Light green border to tie it together
  },
  achievementIcon: { fontSize: 32, marginBottom: 8 },
  achievementTitle: { fontSize: 14, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  achievementDesc: { fontSize: 11, textAlign: "center", color: theme.muted, fontWeight: "600" },

  emptyText: { color: theme.muted, fontStyle: 'italic', marginTop: 10, textAlign: "center" }
});
import React, { useState, useEffect } from "react";
import { Text, View } from "react-native"; // Added missing Text/View imports
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context"; // FIXED: Added this import

// Firebase & Auth
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig"; 
import Login from "./login"; 

// Stores & Theme
import { GoalsProvider } from "./components/GoalsStore";
import { theme } from "./theme";

// Screen Imports (Ensure these paths are correct)
import GoalsScreen from "./screens/GoalsScreen";
import AddGoalScreen from "./screens/AddGoalScreen";
import GoalScreen from "./screens/GoalScreen";
import CalendarScreen from "./screens/CalendarScreen";

// --- Helpers ---
function Placeholder({ title }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <Text style={{ fontWeight: "900", color: theme.muted }}>{title}</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function GoalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GoalsHome" component={GoalsScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
    </Stack.Navigator>
  );
}

function AddStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddGoal" component={AddGoalScreen} />
    </Stack.Navigator>
  );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Listen for Firebase login/logout
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Show nothing while we check if the user is logged in
  if (initializing) return null;

  return (
    <SafeAreaProvider> 
      <GoalsProvider>
        <NavigationContainer>
          <StatusBar style="dark" />

          {user ? (
            /* APP CONTENT (Tabs) */
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  height: 64,
                  backgroundColor: theme.surface,
                  borderTopWidth: 0,
                },
                tabBarActiveTintColor: theme.text,
                tabBarInactiveTintColor: theme.muted,
                tabBarLabelStyle: { fontSize: 10, marginBottom: 8, fontWeight: "800" },
              }}
            >
              <Tab.Screen name="Rank" children={() => <Placeholder title="Rank (Coming Soon)" />} />
              <Tab.Screen name="Goals" component={GoalsStack} />
              <Tab.Screen name="Add" component={AddStack} options={{ tabBarLabel: "Add" }} />
              <Tab.Screen name="Calendar" component={CalendarScreen} />
              <Tab.Screen name="Garden" children={() => <Placeholder title="Garden (Coming Soon)" />} />
            </Tab.Navigator>
          ) : (
            /* LOGIN FLOW */
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={Login} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </GoalsProvider>
    </SafeAreaProvider>
  );
}
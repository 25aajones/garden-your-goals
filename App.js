// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import { GoalsProvider } from "./components/GoalsStore";

import HomeScreen from "./screens/HomeScreen";
import HabitsScreen from "./screens/HabitsScreen";
import AddGoalScreen from "./screens/AddGoalScreen";
import GoalScreen from "./screens/GoalScreen";

// Simple placeholders to match your bottom tabs in Figma
function Placeholder({ title }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>{title}</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HabitsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HabitsHome" component={HabitsScreen} />
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

export default function App() {
  return (
    <GoalsProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              height: 64,
              backgroundColor: "#b9a78f", // tan bar in Figma
              borderTopWidth: 0,
            },
            tabBarActiveTintColor: "#2f2a20",
            tabBarInactiveTintColor: "#5b5246",
            tabBarLabelStyle: { fontSize: 10, marginBottom: 8 },
          }}
        >
          <Tab.Screen
            name="Rank"
            children={() => <Placeholder title="Rank (Coming Soon)" />}
          />
          <Tab.Screen name="Habits" component={HabitsStack} />
          <Tab.Screen
            name="Add"
            component={AddStack}
            options={{ tabBarLabel: "Add" }}
          />
          <Tab.Screen
            name="Calendar"
            children={() => <Placeholder title="Calendar (Coming Soon)" />}
          />
          <Tab.Screen
            name="Garden"
            children={() => <Placeholder title="Garden (Coming Soon)" />}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GoalsProvider>
  );
}

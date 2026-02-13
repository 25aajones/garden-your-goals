// components/Page.js
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";

export default function Page({ children, padded = true }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "left", "right"]}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingHorizontal: padded ? theme.pad : 0,
        }}
      >
        <View style={{ height: theme.topGap }} />
        {children}
      </View>
    </SafeAreaView>
  );
}

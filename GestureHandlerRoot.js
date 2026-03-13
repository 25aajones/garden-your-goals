import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function GestureHandlerRoot({ children }) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}

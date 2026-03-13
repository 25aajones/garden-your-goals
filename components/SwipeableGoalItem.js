import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';

export default function SwipeableGoalItem({ item, onDelete, children }) {
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1.1, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.rightAction, { transform: [{ scale }] }]}> 
        <Pressable style={styles.deleteButton} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={32} color="#fff" style={styles.trashIcon} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      onSwipeableRightOpen={() => onDelete(item)}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: 16,
    marginBottom: 12,
    height: 74,
    backgroundColor: 'transparent',
  },
  rightAction: {
    flex: 1,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    borderRadius: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
    paddingRight: 32,
    backgroundColor: 'transparent',
  },
  trashIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 0,
    marginRight: 12,
    letterSpacing: 0.5,
  },
});

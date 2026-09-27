// src/components/SearchBar.js
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radii, spacing, typography } from '../theme/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Search songs, artists...' }) {
  const [focused, setFocused] = useState(false);
  const widthProgress = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: focused ? colors.accent : colors.border,
  }));

  const handleFocus = () => {
    setFocused(true);
    widthProgress.value = withTiming(1, { duration: 180 });
  };
  const handleBlur = () => {
    setFocused(false);
    widthProgress.value = withTiming(0, { duration: 180 });
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: 6 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    paddingVertical: 0,
  },
});

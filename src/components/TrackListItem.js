// src/components/TrackListItem.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radii, spacing, typography } from '../theme/theme';

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackListItem({ track, isActive, onPress, onLongPress, onMorePress }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPressIn={() => (scale.value = withTiming(0.98, { duration: 100 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.row}
      >
        <View style={styles.artworkWrap}>
          {track.artwork ? (
            <Image source={{ uri: track.artwork }} style={styles.artwork} contentFit="cover" />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Text style={styles.artworkPlaceholderText}>
                {track.title?.[0]?.toUpperCase() || '♪'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.textCol}>
          <Text
            numberOfLines={1}
            style={[styles.title, isActive && { color: colors.accent }]}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {track.artist}
          </Text>
        </View>

        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

        <TouchableOpacity hitSlop={12} onPress={onMorePress} style={styles.moreButton}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  artworkWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  artwork: { width: '100%', height: '100%' },
  artworkPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: { color: colors.textSecondary, fontWeight: '700' },
  textCol: { flex: 1, marginRight: spacing.sm },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  duration: { ...typography.caption, color: colors.textTertiary, marginRight: spacing.sm },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    gap: 2,
  },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textTertiary },
});

// src/components/MiniPlayer.js
// Persistent mini player shown above the tab bar. Swiping up (or tapping)
// opens the full-screen Now Playing view, matching the Lark Player / Apple
// Music interaction pattern.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayer } from '../context/PlayerContext';
import { colors, radii, spacing, typography } from '../theme/theme';

export default function MiniPlayer() {
  const navigation = useNavigation();
  const { currentTrack, isPlaying, togglePlayPause, playNext, positionMillis, durationMillis } =
    usePlayer();

  if (!currentTrack) return null;

  const openNowPlaying = () => navigation.navigate('NowPlaying');

  const swipeUp = Gesture.Fling()
    .direction(8 /* Directions.UP */)
    .onEnd(() => runOnJS(openNowPlaying)());

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  return (
    <GestureDetector gesture={swipeUp}>
      <TouchableOpacity activeOpacity={0.9} onPress={openNowPlaying} style={styles.wrapper}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.row}>
          <View style={styles.artworkWrap}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Text style={{ color: colors.textSecondary }}>♪</Text>
              </View>
            )}
          </View>

          <View style={styles.textCol}>
            <Text numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {currentTrack.artist}
            </Text>
          </View>

          <TouchableOpacity hitSlop={10} onPress={togglePlayPause} style={styles.iconButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={10} onPress={playNext} style={styles.iconButton}>
            <Ionicons name="play-skip-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressTrack: { height: 2, backgroundColor: colors.border, width: '100%' },
  progressFill: { height: 2, backgroundColor: colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  artworkWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  artwork: { width: '100%', height: '100%' },
  artworkPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, marginRight: spacing.sm },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  subtitle: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
  iconButton: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
});

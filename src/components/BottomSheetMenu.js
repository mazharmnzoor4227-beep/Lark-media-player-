// src/components/BottomSheetMenu.js
// A reusable bottom-sheet used for track option menus ("Add to Playlist",
// "Details", "Share", etc). Mimics iOS: blurred dimmed backdrop, spring-in
// sheet, swipe-down-to-dismiss gesture.

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, radii, spacing, typography } from '../theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING_CONFIG = { damping: 22, stiffness: 260, mass: 0.9 };

/**
 * props:
 *  visible: boolean
 *  onClose: () => void
 *  title?: string
 *  options: { icon?: string, label: string, destructive?: boolean, onPress: () => void }[]
 */
export default function BottomSheetMenu({ visible, onClose, title, options = [] }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const close = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
    backdropOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.grabber} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.optionsGroup}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={opt.label + idx}
                style={[
                  styles.optionRow,
                  idx !== options.length - 1 && styles.optionDivider,
                ]}
                onPress={() => {
                  close();
                  setTimeout(() => opt.onPress?.(), 220);
                }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    opt.destructive && { color: '#FF453A' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={close}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  optionsGroup: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  optionRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  cancelButton: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.headline,
    color: colors.accent,
  },
});

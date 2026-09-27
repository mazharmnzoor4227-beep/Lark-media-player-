// src/screens/NowPlayingScreen.js
// The signature screen: big album art, iOS-fluid swipe-to-skip gestures,
// swipe-down-to-dismiss, and a background gradient derived from the track.

import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { usePlayer } from '../context/PlayerContext';
import BottomSheetMenu from '../components/BottomSheetMenu';
import { colors, radii, spacing, typography, gradientForTrackId } from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };

function formatMillis(ms = 0) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen() {
  const navigation = useNavigation();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    positionMillis,
    durationMillis,
    seekTo,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
  } = usePlayer();

  const [menuVisible, setMenuVisible] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    if (!isScrubbing) setSliderValue(positionMillis);
  }, [positionMillis, isScrubbing]);

  const close = () => navigation.goBack();

  // Horizontal fling = skip track. Vertical drag down = dismiss.
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Prioritize whichever axis has more movement.
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        translateX.value = e.translationX;
        translateY.value = 0;
      } else if (e.translationY > 0) {
        translateY.value = e.translationY;
        translateX.value = 0;
      }
    })
    .onEnd((e) => {
      const horizontalWin = Math.abs(e.translationX) > Math.abs(e.translationY);

      if (horizontalWin) {
        if (e.translationX < -SWIPE_THRESHOLD) {
          // swipe left -> next track
          cardOpacity.value = withTiming(0, { duration: 120 });
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180 }, (finished) => {
            if (finished) {
              runOnJS(playNext)();
              translateX.value = SCREEN_WIDTH;
              cardOpacity.value = 0;
              translateX.value = withSpring(0, SPRING);
              cardOpacity.value = withTiming(1, { duration: 200 });
            }
          });
        } else if (e.translationX > SWIPE_THRESHOLD) {
          // swipe right -> previous track
          cardOpacity.value = withTiming(0, { duration: 120 });
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 180 }, (finished) => {
            if (finished) {
              runOnJS(playPrevious)();
              translateX.value = -SCREEN_WIDTH;
              cardOpacity.value = 0;
              translateX.value = withSpring(0, SPRING);
              cardOpacity.value = withTiming(1, { duration: 200 });
            }
          });
        } else {
          translateX.value = withSpring(0, SPRING);
        }
      } else {
        if (e.translationY > 140 || e.velocityY > 900) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
            if (finished) runOnJS(close)();
          });
        } else {
          translateY.value = withSpring(0, SPRING);
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const dismissScale = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [1, 0.9],
      Extrapolation.CLAMP
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: dismissScale },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.6],
      [1, 0.4],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  if (!currentTrack) return null;

  const [gradientStart, gradientEnd] = gradientForTrackId(currentTrack.id);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <LinearGradient
          colors={[gradientStart, gradientEnd, colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={close} hitSlop={12} style={styles.chevron}>
                <Ionicons name="chevron-down" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.topBarLabel}>Now Playing</Text>
              <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={12}>
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.artworkWrap}>
              {currentTrack.artwork ? (
                <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
              ) : (
                <View style={[styles.artwork, styles.artworkPlaceholder]}>
                  <Ionicons name="musical-notes" size={72} color={colors.textSecondary} />
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.trackTitle}>
                  {currentTrack.title}
                </Text>
                <Text numberOfLines={1} style={styles.trackArtist}>
                  {currentTrack.artist}
                </Text>
              </View>
              <TouchableOpacity hitSlop={10}>
                <Ionicons name="heart-outline" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(durationMillis, 1)}
              value={sliderValue}
              minimumTrackTintColor={colors.textPrimary}
              maximumTrackTintColor={colors.card}
              thumbTintColor={colors.textPrimary}
              onSlidingStart={() => setIsScrubbing(true)}
              onValueChange={setSliderValue}
              onSlidingComplete={(v) => {
                setIsScrubbing(false);
                seekTo(v);
              }}
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{formatMillis(sliderValue)}</Text>
              <Text style={styles.timeLabel}>{formatMillis(durationMillis)}</Text>
            </View>

            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={toggleShuffle} hitSlop={10}>
                <Ionicons
                  name="shuffle"
                  size={22}
                  color={shuffle ? colors.accent : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={playPrevious} hitSlop={10}>
                <Ionicons name="play-skip-back" size={30} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.background}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={playNext} hitSlop={10}>
                <Ionicons name="play-skip-forward" size={30} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleRepeatMode} hitSlop={10}>
                <Ionicons
                  name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                  size={22}
                  color={repeatMode !== 'off' ? colors.accent : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.swipeHint}>Swipe left/right to skip tracks</Text>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>

      <BottomSheetMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={currentTrack.title}
        options={[
          { label: 'Add to Playlist', onPress: () => {} },
          { label: 'Show Album', onPress: () => {} },
          { label: 'Share', onPress: () => {} },
          { label: 'Song Details', onPress: () => {} },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  chevron: { padding: 4 },
  topBarLabel: { ...typography.caption, color: colors.textSecondary },
  artworkWrap: {
    marginTop: spacing.xl,
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  artwork: { width: '100%', height: '100%' },
  artworkPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  trackTitle: { ...typography.title, color: colors.textPrimary },
  trackArtist: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  slider: { width: '100%', height: 32, marginTop: spacing.md },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  timeLabel: { ...typography.micro, color: colors.textTertiary },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  playButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    ...typography.micro,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

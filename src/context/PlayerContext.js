// src/context/PlayerContext.js
// Single source of truth for playback. Wrap the app in <PlayerProvider> once
// (see App.js) and any screen can call usePlayer() to read/control state.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Audio } from 'expo-av';

const PlayerContext = createContext(null);

const REPEAT_MODES = ['off', 'all', 'one'];

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const [queue, setQueue] = useState([]); // playback order (post-shuffle)
  const [originalQueue, setOriginalQueue] = useState([]); // library order
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // off | all | one

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

  // Configure audio session once: play in background, respect silent switch off.
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: 1, // DoNotMix
      interruptionModeAndroid: 1,
    }).catch(() => {});

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    (status) => {
      if (!status.isLoaded) {
        setIsBuffering(true);
        return;
      }
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);
      setPositionMillis(status.positionMillis || 0);
      setDurationMillis(status.durationMillis || 0);

      if (status.didJustFinish && !status.isLooping) {
        handleTrackFinished();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, queue, repeatMode]
  );

  async function loadAndPlay(index, list = queue) {
    if (index < 0 || index >= list.length) return;
    const track = list[index];

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsBuffering(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay: true,
          isLooping: repeatMode === 'one',
          progressUpdateIntervalMillis: 250,
        },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setCurrentIndex(index);
    } catch (err) {
      console.warn('Playback failed to load track', track?.title, err);
      setIsBuffering(false);
    }
  }

  function handleTrackFinished() {
    if (repeatMode === 'one') {
      soundRef.current?.replayAsync();
      return;
    }
    const isLast = currentIndex === queue.length - 1;
    if (isLast && repeatMode === 'off') {
      setIsPlaying(false);
      return;
    }
    const nextIndex = isLast ? 0 : currentIndex + 1;
    loadAndPlay(nextIndex);
  }

  const playQueue = useCallback(async (tracks, startIndex = 0) => {
    setOriginalQueue(tracks);
    setQueue(tracks);
    await loadAndPlay(startIndex, tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const isLast = currentIndex === queue.length - 1;
    const nextIndex = isLast ? 0 : currentIndex + 1;
    loadAndPlay(nextIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    // If we're more than 3s into the track, restart it instead of skipping back
    // — matches standard iOS player behavior.
    if (positionMillis > 3000) {
      soundRef.current?.setPositionAsync(0);
      return;
    }
    const isFirst = currentIndex === 0;
    const prevIndex = isFirst ? queue.length - 1 : currentIndex - 1;
    loadAndPlay(prevIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue, positionMillis]);

  const seekTo = useCallback(async (millis) => {
    await soundRef.current?.setPositionAsync(millis);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev;
      if (next) {
        const current = queue[currentIndex];
        const rest = queue.filter((_, i) => i !== currentIndex);
        const shuffled = shuffleArray(rest);
        const newQueue = current ? [current, ...shuffled] : shuffled;
        setQueue(newQueue);
        setCurrentIndex(current ? 0 : -1);
      } else {
        const current = queue[currentIndex];
        setQueue(originalQueue);
        const idx = originalQueue.findIndex((t) => t.id === current?.id);
        setCurrentIndex(idx >= 0 ? idx : 0);
      }
      return next;
    });
  }, [queue, currentIndex, originalQueue]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const idx = REPEAT_MODES.indexOf(prev);
      const next = REPEAT_MODES[(idx + 1) % REPEAT_MODES.length];
      soundRef.current?.setIsLoopingAsync(next === 'one');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      isBuffering,
      positionMillis,
      durationMillis,
      shuffle,
      repeatMode,
      playQueue,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
    }),
    [
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      isBuffering,
      positionMillis,
      durationMillis,
      shuffle,
      repeatMode,
      playQueue,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

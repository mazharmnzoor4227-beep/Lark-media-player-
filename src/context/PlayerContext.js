import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const PlayerContext = createContext(null);
const REPEAT_MODES = ['off', 'all', 'one'];

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const queueRef = useRef([]);
  const indexRef = useRef(-1);
  const repeatRef = useRef('off');
  const loadingTokenRef = useRef(0);

  const [queue, setQueueState] = useState([]);
  const [originalQueue, setOriginalQueue] = useState([]);
  const [currentIndex, setCurrentIndexState] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatModeState] = useState('off');

  const setQueue = useCallback((next) => {
    queueRef.current = next;
    setQueueState(next);
  }, []);

  const setCurrentIndex = useCallback((next) => {
    indexRef.current = next;
    setCurrentIndexState(next);
  }, []);

  const setRepeatMode = useCallback((next) => {
    repeatRef.current = next;
    setRepeatModeState(next);
  }, []);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch((error) => console.warn('Audio mode setup failed', error));

    return () => {
      loadingTokenRef.current += 1;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const loadAndPlay = useCallback(async (index, list = queueRef.current) => {
    if (!Array.isArray(list) || index < 0 || index >= list.length) return;

    const token = ++loadingTokenRef.current;
    const track = list[index];
    setPlaybackError(null);
    setIsBuffering(true);
    setPositionMillis(0);
    setDurationMillis(0);

    try {
      if (soundRef.current) {
        const previous = soundRef.current;
        soundRef.current = null;
        await previous.unloadAsync().catch(() => {});
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay: true,
          isLooping: repeatRef.current === 'one',
          progressUpdateIntervalMillis: 250,
        }
      );

      if (token !== loadingTokenRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setCurrentIndex(index);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (token !== loadingTokenRef.current) return;
        if (!status.isLoaded) {
          if (status.error) setPlaybackError(status.error);
          setIsBuffering(false);
          return;
        }

        setIsBuffering(Boolean(status.isBuffering));
        setIsPlaying(Boolean(status.isPlaying));
        setPositionMillis(status.positionMillis || 0);
        setDurationMillis(status.durationMillis || 0);

        if (status.didJustFinish && !status.isLooping) {
          const activeQueue = queueRef.current;
          const activeIndex = indexRef.current;
          const repeat = repeatRef.current;
          const isLast = activeIndex >= activeQueue.length - 1;

          if (isLast && repeat === 'off') {
            setIsPlaying(false);
            return;
          }

          const nextIndex = isLast ? 0 : activeIndex + 1;
          loadAndPlay(nextIndex, activeQueue);
        }
      });
    } catch (error) {
      if (token === loadingTokenRef.current) {
        setPlaybackError(error?.message || 'Unable to play this track');
        setIsPlaying(false);
        setIsBuffering(false);
      }
      console.warn('Playback failed to load track', track?.title, error);
    }
  }, [setCurrentIndex]);

  const playQueue = useCallback(async (tracks, startIndex = 0) => {
    const safeTracks = Array.isArray(tracks) ? tracks : [];
    if (!safeTracks.length) return;
    setOriginalQueue(safeTracks);
    setQueue(safeTracks);
    await loadAndPlay(Math.max(0, Math.min(startIndex, safeTracks.length - 1)), safeTracks);
  }, [loadAndPlay, setQueue]);

  const togglePlayPause = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) await sound.pauseAsync();
      else await sound.playAsync();
    } catch (error) {
      setPlaybackError(error?.message || 'Playback control failed');
    }
  }, []);

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    if (!activeQueue.length) return;
    const activeIndex = indexRef.current < 0 ? 0 : indexRef.current;
    const nextIndex = activeIndex >= activeQueue.length - 1 ? 0 : activeIndex + 1;
    loadAndPlay(nextIndex, activeQueue);
  }, [loadAndPlay]);

  const playPrevious = useCallback(() => {
    const activeQueue = queueRef.current;
    if (!activeQueue.length) return;

    if (positionMillis > 3000 && soundRef.current) {
      soundRef.current.setPositionAsync(0).catch(() => {});
      return;
    }

    const activeIndex = indexRef.current < 0 ? 0 : indexRef.current;
    const previousIndex = activeIndex <= 0 ? activeQueue.length - 1 : activeIndex - 1;
    loadAndPlay(previousIndex, activeQueue);
  }, [loadAndPlay, positionMillis]);

  const seekTo = useCallback(async (millis) => {
    const sound = soundRef.current;
    if (!sound) return;
    const target = Math.max(0, Math.min(Number(millis) || 0, durationMillis || Infinity));
    await sound.setPositionAsync(target).catch((error) => {
      setPlaybackError(error?.message || 'Seeking failed');
    });
  }, [durationMillis]);

  const toggleShuffle = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeIndex = indexRef.current;
    const activeTrack = activeQueue[activeIndex];

    setShuffle((wasShuffled) => {
      const nextShuffle = !wasShuffled;
      if (nextShuffle) {
        const remaining = activeQueue.filter((_, index) => index !== activeIndex);
        const nextQueue = activeTrack ? [activeTrack, ...shuffleArray(remaining)] : shuffleArray(remaining);
        setQueue(nextQueue);
        setCurrentIndex(activeTrack ? 0 : -1);
      } else {
        const nextQueue = originalQueue;
        const restoredIndex = nextQueue.findIndex((track) => track.id === activeTrack?.id);
        setQueue(nextQueue);
        setCurrentIndex(restoredIndex >= 0 ? restoredIndex : nextQueue.length ? 0 : -1);
      }
      return nextShuffle;
    });
  }, [originalQueue, setCurrentIndex, setQueue]);

  const cycleRepeatMode = useCallback(() => {
    const current = repeatRef.current;
    const next = REPEAT_MODES[(REPEAT_MODES.indexOf(current) + 1) % REPEAT_MODES.length];
    setRepeatMode(next);
    soundRef.current?.setIsLoopingAsync(next === 'one').catch(() => {});
  }, [setRepeatMode]);

  const value = useMemo(() => ({
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    isBuffering,
    playbackError,
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
  }), [
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    isBuffering,
    playbackError,
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
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

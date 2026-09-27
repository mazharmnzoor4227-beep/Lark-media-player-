# Lark-Style Player (Expo / React Native)

A modular local music player inspired by **Lark Player** — dark theme,
blurred iOS-style bottom sheets, swipe-to-skip Now Playing screen, and
automatic local-media scanning.

## 1. Setup

```bash
npx create-expo-app lark-player-clone --template blank
# then copy these files into the generated project, overwriting App.js/app.json,
# or just `npx expo install` the dependencies listed in package.json inside
# this project as-is.

npm install
npx expo install expo-media-library expo-av expo-linear-gradient expo-blur \
  expo-file-system expo-image react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-screens @react-native-community/slider \
  @expo/vector-icons

npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

npx expo start
```

> Local audio scanning and background playback require a **development
> build** (or EAS build) — `expo-media-library` and background audio modes
> are not available in Expo Go on iOS. Run `npx expo run:ios` / `run:android`,
> or build with EAS.

## 2. Folder Structure

```
App.js                          entry point — providers + navigator
app.json                        Expo config, permissions, background audio mode
babel.config.js                 enables reanimated plugin (must stay last)

src/
  theme/
    theme.js                    colors, spacing, typography, gradient helper
  context/
    PlayerContext.js            global playback state (expo-av), queue, shuffle/repeat
  utils/
    mediaLibrary.js             expo-media-library wrapper: scan, group, search
  navigation/
    AppNavigator.js             stack nav — Home + modal NowPlaying screen
  components/
    TrackListItem.js            reusable song row (press animation)
    MiniPlayer.js                persistent mini bar, swipe-up to expand
    BottomSheetMenu.js          blurred iOS-style action sheet
    SearchBar.js                animated search input
  screens/
    HomeScreen.js               Songs / Playlists / Artists / Albums tabs
    NowPlayingScreen.js         big artwork, scrubber, swipe gestures
```

## 3. Key implementation notes

- **Playback**: `PlayerContext` uses `expo-av`'s `Audio.Sound` with
  `staysActiveInBackground: true` for lock-screen/background playback. For a
  fully native lock-screen transport (scrubbing from the lock screen, Control
  Center art), swap this out for `react-native-track-player` — the context's
  public API (`playQueue`, `togglePlayPause`, `playNext`, etc.) is written so
  screens don't need to change if you do.
- **Gestures**: `react-native-gesture-handler`'s `Gesture.Pan` drives both the
  Now Playing swipe-to-skip (horizontal) and swipe-to-dismiss (vertical), and
  `Gesture.Fling` powers the mini-player's swipe-up-to-expand. All animated
  values are `react-native-reanimated` shared values so gestures run on the
  UI thread — no bridge lag.
- **Bottom sheets**: `BottomSheetMenu` combines `expo-blur` with a spring
  animation and its own pan-to-dismiss gesture, reused by both the song list
  and the Now Playing "..." menu.
- **Dynamic background**: `gradientForTrackId` in `theme.js` is a lightweight
  deterministic placeholder (hashes the track id to a fixed gradient pair).
  Swap it for real album-art color extraction with `node-vibrant` — feed the
  local artwork URI into `Vibrant.from(uri).getPalette()` and cache the result
  per track id.
- **Memory management**: `PlayerContext` unloads the previous `Sound` object
  before loading the next (`soundRef.current.unloadAsync()`), and unloads on
  provider unmount. `FlatList` is used everywhere instead of `.map()` so long
  libraries stay virtualized and lightweight.

## 4. Next steps to reach full production parity

1. Real ID3 tag + embedded artwork extraction (native module or a JS ID3
   parser) — filenames are used as a fallback only.
2. Persist playlists/favorites (AsyncStorage or SQLite via `expo-sqlite`).
2. Swap `expo-av` for `react-native-track-player` for full native lock-screen
   controls and more efficient background playback.
3. Add `react-native-track-player`'s `Capability` events to sync play/pause/
   next/previous from lock screen back into `PlayerContext`.

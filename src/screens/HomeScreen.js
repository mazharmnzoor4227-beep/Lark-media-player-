// src/screens/HomeScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { usePlayer } from '../context/PlayerContext';
import TrackListItem from '../components/TrackListItem';
import MiniPlayer from '../components/MiniPlayer';
import SearchBar from '../components/SearchBar';
import BottomSheetMenu from '../components/BottomSheetMenu';
import {
  requestAudioPermission,
  fetchAllTracks,
  groupByArtist,
  groupByAlbum,
  searchTracks,
} from '../utils/mediaLibrary';
import { colors, spacing, typography } from '../theme/theme';

const TABS = ['Songs', 'Playlists', 'Artists', 'Albums'];

export default function HomeScreen() {
  const [permissionState, setPermissionState] = useState('unknown'); // unknown | granted | denied
  const [loading, setLoading] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [activeTab, setActiveTab] = useState('Songs');
  const [query, setQuery] = useState('');
  const [menuTrack, setMenuTrack] = useState(null);

  const { playQueue, currentTrack } = usePlayer();

  const scan = useCallback(async () => {
    const { granted } = await requestAudioPermission();
    if (!granted) {
      setPermissionState('denied');
      return;
    }
    setPermissionState('granted');
    setLoading(true);
    try {
      const all = await fetchAllTracks((count) => setScannedCount(count));
      setTracks(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  const filteredTracks = useMemo(() => searchTracks(tracks, query), [tracks, query]);
  const artistGroups = useMemo(() => groupByArtist(filteredTracks), [filteredTracks]);
  const albumGroups = useMemo(() => groupByAlbum(filteredTracks), [filteredTracks]);

  if (permissionState === 'denied') {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.emptyTitle}>Media Access Needed</Text>
        <Text style={styles.emptySubtitle}>
          Enable media library access in system settings so the app can find your songs.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={scan}>
          <Text style={styles.retryLabel}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
      </View>

      <SearchBar value={query} onChangeText={setQuery} />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabButton}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centeredScreen}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.scanningLabel}>Scanning your device… {scannedCount} found</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(250)}>
          {activeTab === 'Songs' && (
            <FlatList
              data={filteredTracks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item, index }) => (
                <TrackListItem
                  track={item}
                  isActive={currentTrack?.id === item.id}
                  onPress={() => playQueue(filteredTracks, index)}
                  onLongPress={() => setMenuTrack(item)}
                  onMorePress={() => setMenuTrack(item)}
                />
              )}
              ListEmptyComponent={<EmptyList label="No songs found" />}
            />
          )}

          {activeTab === 'Playlists' && (
            <View style={styles.centeredScreen}>
              <Text style={styles.emptyTitle}>No Playlists Yet</Text>
              <Text style={styles.emptySubtitle}>
                Long-press any song and choose "Add to Playlist" to create one.
              </Text>
            </View>
          )}

          {activeTab === 'Artists' && (
            <FlatList
              data={artistGroups}
              keyExtractor={(item) => item.artist}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item }) => (
                <View style={styles.groupHeaderRow}>
                  <Text style={styles.groupTitle}>{item.artist}</Text>
                  <Text style={styles.groupCount}>{item.songs.length} songs</Text>
                </View>
              )}
              ListEmptyComponent={<EmptyList label="No artists found" />}
            />
          )}

          {activeTab === 'Albums' && (
            <FlatList
              data={albumGroups}
              keyExtractor={(item) => item.album}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item }) => (
                <View style={styles.groupHeaderRow}>
                  <Text style={styles.groupTitle}>{item.album}</Text>
                  <Text style={styles.groupCount}>{item.songs.length} songs</Text>
                </View>
              )}
              ListEmptyComponent={<EmptyList label="No albums found" />}
            />
          )}
        </Animated.View>
      )}

      <View style={styles.miniPlayerSlot}>
        <MiniPlayer />
      </View>

      <BottomSheetMenu
        visible={!!menuTrack}
        onClose={() => setMenuTrack(null)}
        title={menuTrack?.title}
        options={[
          { label: 'Play Next', onPress: () => {} },
          { label: 'Add to Playlist', onPress: () => {} },
          { label: 'Share', onPress: () => {} },
          { label: 'Details', onPress: () => {} },
          { label: 'Delete from Device', destructive: true, onPress: () => {} },
        ]}
      />
    </SafeAreaView>
  );
}

function EmptyList({ label }) {
  return (
    <View style={styles.centeredScreen}>
      <Text style={styles.emptySubtitle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { ...typography.largeTitle, color: colors.textPrimary },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.lg,
  },
  tabButton: { paddingBottom: spacing.xs },
  tabLabel: { ...typography.headline, color: colors.textTertiary },
  tabLabelActive: { color: colors.textPrimary },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  scanningLabel: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  emptyTitle: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  retryLabel: { ...typography.headline, color: '#fff' },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  groupTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  groupCount: { ...typography.caption, color: colors.textTertiary },
  miniPlayerSlot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

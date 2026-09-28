import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [permissionState, setPermissionState] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [scannedCount, setScannedCount] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [scanError, setScanError] = useState(null);
  const [activeTab, setActiveTab] = useState('Songs');
  const [query, setQuery] = useState('');
  const [menuTrack, setMenuTrack] = useState(null);

  const { playQueue, currentTrack } = usePlayer();

  const scan = useCallback(async () => {
    setLoading(true);
    setScanError(null);
    setScannedCount(0);

    try {
      const { granted, canAskAgain } = await requestAudioPermission();
      if (!granted) {
        setPermissionState(canAskAgain ? 'denied' : 'blocked');
        return;
      }

      setPermissionState('granted');
      const all = await fetchAllTracks((count) => setScannedCount(count));
      setTracks(all);
    } catch (error) {
      console.warn('Media library scan failed', error);
      setScanError(error?.message || 'Could not read songs from this device.');
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

  if (permissionState === 'denied' || permissionState === 'blocked') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.centeredScreen}>
          <Text style={styles.emptyTitle}>Music Access Needed</Text>
          <Text style={styles.emptySubtitle}>
            Allow Lark Media Player to access audio files so it can build your local music library.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={permissionState === 'blocked' ? Linking.openSettings : scan}
          >
            <Text style={styles.retryLabel}>
              {permissionState === 'blocked' ? 'Open Settings' : 'Allow Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LARK</Text>
          <Text style={styles.headerTitle}>Your Library</Text>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={scan} disabled={loading}>
          <Text style={styles.scanButtonText}>{loading ? 'Scanning' : 'Rescan'}</Text>
        </TouchableOpacity>
      </View>

      <SearchBar value={query} onChangeText={setQuery} />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabButton}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centeredScreen}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.scanningLabel}>Scanning your music… {scannedCount} found</Text>
        </View>
      ) : scanError ? (
        <View style={styles.centeredScreen}>
          <Text style={styles.emptyTitle}>Couldn't Read Music</Text>
          <Text style={styles.emptySubtitle}>{scanError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={scan}>
            <Text style={styles.retryLabel}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={styles.listArea} entering={FadeIn.duration(280)}>
          {activeTab === 'Songs' && (
            <FlatList
              data={filteredTracks}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <TrackListItem
                  track={item}
                  isActive={currentTrack?.id === item.id}
                  onPress={() => playQueue(filteredTracks, index)}
                  onLongPress={() => setMenuTrack(item)}
                  onMorePress={() => setMenuTrack(item)}
                />
              )}
              ListEmptyComponent={<EmptyList label="No audio files found on this device" />}
            />
          )}

          {activeTab === 'Playlists' && (
            <EmptyList label="No playlists yet — your songs are ready in the Songs tab" />
          )}

          {activeTab === 'Artists' && (
            <FlatList
              data={artistGroups}
              keyExtractor={(item, index) => `${item.artist}-${index}`}
              contentContainerStyle={styles.listContent}
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
              keyExtractor={(item, index) => `${item.album}-${index}`}
              contentContainerStyle={styles.listContent}
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

      <View style={styles.miniPlayerSlot} pointerEvents="box-none">
        <MiniPlayer />
      </View>

      <BottomSheetMenu
        visible={!!menuTrack}
        onClose={() => setMenuTrack(null)}
        title={menuTrack?.title}
        options={[
          { label: 'Play Now', onPress: () => {
            const index = filteredTracks.findIndex((track) => track.id === menuTrack?.id);
            if (index >= 0) playQueue(filteredTracks, index);
          } },
          { label: 'Add to Playlist', onPress: () => {} },
          { label: 'Details', onPress: () => {} },
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: { ...typography.micro, color: colors.accent, letterSpacing: 2, marginBottom: 2 },
  headerTitle: { ...typography.largeTitle, color: colors.textPrimary },
  scanButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card },
  scanButtonText: { ...typography.caption, color: colors.textSecondary },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.lg,
  },
  tabButton: { paddingBottom: spacing.xs },
  tabLabel: { ...typography.headline, color: colors.textTertiary },
  tabLabelActive: { color: colors.textPrimary },
  tabUnderline: { marginTop: 6, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  listArea: { flex: 1 },
  listContent: { paddingBottom: 120, flexGrow: 1 },
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    minHeight: 220,
  },
  scanningLabel: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  emptyTitle: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryLabel: { ...typography.headline, color: colors.background },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  groupTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  groupCount: { ...typography.caption, color: colors.textTertiary },
  miniPlayerSlot: { position: 'absolute', left: 0, right: 0, bottom: spacing.sm },
});

// src/utils/mediaLibrary.js
// Wraps expo-media-library so the rest of the app never talks to it directly.
// Keeping this isolated means swapping the scanning strategy later only
// touches this one file.

import * as MediaLibrary from 'expo-media-library';

export async function requestAudioPermission() {
  const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
}

/**
 * Paginates through the device's audio library and returns a flat,
 * normalized array of track objects. Expo returns pages of up to 100
 * items at a time, so we walk `endCursor` until `hasNextPage` is false.
 */
export async function fetchAllTracks(onProgress) {
  const tracks = [];
  let page = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.audio,
    first: 200,
    sortBy: [MediaLibrary.SortBy.creationTime],
  });

  tracks.push(...normalize(page.assets));
  onProgress?.(tracks.length);

  while (page.hasNextPage) {
    page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after: page.endCursor,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });
    tracks.push(...normalize(page.assets));
    onProgress?.(tracks.length);
  }

  return tracks;
}

function normalize(assets) {
  return assets.map((asset) => {
    // MediaLibrary doesn't reliably expose ID3 tags cross-platform, so we
    // derive a friendly title/artist split from the filename as a fallback.
    const { title, artist } = splitFilename(asset.filename);
    return {
      id: asset.id,
      uri: asset.uri,
      duration: asset.duration || 0,
      filename: asset.filename,
      title,
      artist,
      album: 'Unknown Album',
      artwork: null, // populated lazily via getArtworkAsync when needed
      modificationTime: asset.modificationTime,
    };
  });
}

function splitFilename(filename = 'Unknown Track') {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const parts = withoutExt.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: 'Unknown Artist', title: withoutExt };
}

export function groupByArtist(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const key = t.artist || 'Unknown Artist';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return Array.from(map.entries()).map(([artist, songs]) => ({ artist, songs }));
}

export function groupByAlbum(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const key = t.album || 'Unknown Album';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return Array.from(map.entries()).map(([album, songs]) => ({ album, songs }));
}

export function searchTracks(tracks, query) {
  if (!query?.trim()) return tracks;
  const q = query.trim().toLowerCase();
  return tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
  );
}

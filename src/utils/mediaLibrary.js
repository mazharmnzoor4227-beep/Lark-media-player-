import * as MediaLibrary from 'expo-media-library';

const AUDIO_MEDIA_TYPE = MediaLibrary.MediaType?.audio || MediaLibrary.MediaType?.AUDIO || 'audio';
const CREATION_TIME = MediaLibrary.SortBy?.creationTime || MediaLibrary.SortBy?.CREATION_TIME || 'creationTime';

export async function requestAudioPermission() {
  const response = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  return { granted: Boolean(response.granted), canAskAgain: response.canAskAgain !== false };
}

export async function fetchAllTracks(onProgress) {
  const available = await MediaLibrary.isAvailableAsync();
  if (!available) throw new Error('Media library is not available on this device.');

  const tracks = [];
  let page = await MediaLibrary.getAssetsAsync({
    mediaType: AUDIO_MEDIA_TYPE,
    first: 200,
    sortBy: [CREATION_TIME],
  });

  tracks.push(...normalize(page.assets));
  onProgress?.(tracks.length);

  while (page.hasNextPage) {
    page = await MediaLibrary.getAssetsAsync({
      mediaType: AUDIO_MEDIA_TYPE,
      first: 200,
      after: page.endCursor,
      sortBy: [CREATION_TIME],
    });
    tracks.push(...normalize(page.assets));
    onProgress?.(tracks.length);
  }

  return tracks.sort((a, b) => a.title.localeCompare(b.title));
}

function normalize(assets = []) {
  return assets
    .filter((asset) => asset?.uri && asset?.id)
    .map((asset) => {
      const { title, artist } = splitFilename(asset.filename);
      return {
        id: String(asset.id),
        uri: asset.uri,
        duration: Number(asset.duration) || 0,
        filename: asset.filename || 'Unknown Track',
        title,
        artist,
        album: 'Unknown Album',
        artwork: null,
        modificationTime: asset.modificationTime || 0,
      };
    });
}

function splitFilename(filename = 'Unknown Track') {
  const withoutExt = String(filename).replace(/\.[^/.]+$/, '').trim() || 'Unknown Track';
  const parts = withoutExt.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim() || 'Unknown Artist', title: parts.slice(1).join(' - ').trim() || withoutExt };
  }
  return { artist: 'Unknown Artist', title: withoutExt };
}

export function groupByArtist(tracks = []) {
  const map = new Map();
  for (const track of tracks) {
    const key = track.artist || 'Unknown Artist';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(track);
  }
  return Array.from(map.entries()).map(([artist, songs]) => ({ artist, songs }));
}

export function groupByAlbum(tracks = []) {
  const map = new Map();
  for (const track of tracks) {
    const key = track.album || 'Unknown Album';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(track);
  }
  return Array.from(map.entries()).map(([album, songs]) => ({ album, songs }));
}

export function searchTracks(tracks = [], query) {
  if (!query?.trim()) return tracks;
  const q = query.trim().toLowerCase();
  return tracks.filter((track) =>
    [track.title, track.artist, track.album]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}

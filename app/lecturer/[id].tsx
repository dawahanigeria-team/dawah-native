import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../src/components/atoms";
import { TabView } from "../../src/components/molecules/TabView";
import { useDebounce } from "../../src/hooks/useDebounce";
import { Album, albumsApi } from "../../src/services/api/albums.api";
import { LecturerLecture, lecturersApi } from "../../src/services/api/lecturers.api";
import { searchApi } from "../../src/services/api/search.api";
import { addSentryBreadcrumb, captureSentryException } from "../../src/services/config/sentry.config";
import { usePlayerActions } from "../../src/stores";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { SearchPlaylist } from "../../src/types/api.types";
import { Episode } from "../../src/types/types";
import { getInitials, getPlaceholderColor } from "../../src/utils/colorPlaceholder";

// Tab types
type TabType = 'songs' | 'albums' | 'playlists';

// Pagination constants
const PAGE_SIZE = 10;

export default function LecturerDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const lecturerId = Array.isArray(id) ? id[0] : id;
  const lecturerNameHint = Array.isArray(name) ? name[0] : (name || '');
  const { playEpisode } = usePlayerActions();

  // If we navigated here without a valid lecturer id (e.g., id=0), try resolving by name.
  useEffect(() => {
    const normalizeName = (value: string): string =>
      value
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const resolve = async () => {
      if (!lecturerNameHint || lecturerNameHint.trim().length < 2) return;
      if (String(lecturerId) !== '0') return;

      try {
        const cleanedQuery = lecturerNameHint.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
        const cleaned = normalizeName(cleanedQuery);

        // Prefer resolving via the lecturers (RPs) list to get the canonical ID.
        // Search can fail depending on backend indexing.
        try {
          // Try a couple pages to increase hit rate without over-fetching.
          for (const page of [1, 2, 3]) {
            const list = await lecturersApi.getAllLecturers({ page, lim: 200 });
            const exact = list.data.find((l) => normalizeName(l.name) === cleaned);
            const best = exact || list.data.find((l) => normalizeName(l.name).includes(cleaned));
            if (best?.id && String(best.id) !== '0') {
              router.replace(`/lecturer/${best.id}`);
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to resolve lecturer from lecturers list', err);
        }

        const res = await searchApi.searchLecturers(cleanedQuery, 1);
        const candidates = res.data || [];
        const exact = candidates.find((c) => normalizeName(c.name) === cleaned);
        const best = exact || candidates[0];

        if (best?.id && String(best.id) !== '0') {
          router.replace(`/lecturer/${best.id}`);
        }
      } catch (err) {
        console.warn('Failed to resolve lecturer by name', err);
      }
    };

    resolve();
  }, [lecturerId, lecturerNameHint, router]);

  // States
  const [lecturer, setLecturer] = useState<any>(null);
  const [lectures, setLectures] = useState<LecturerLecture[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreLectures, setHasMoreLectures] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingRef = useRef(false);

  // Album Pagination states
  const [currentAlbumPage, setCurrentAlbumPage] = useState(1);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);
  const isAlbumLoadingRef = useRef(false);

  // Playlist Pagination states
  const [playlists, setPlaylists] = useState<SearchPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [currentPlaylistPage, setCurrentPlaylistPage] = useState(1);
  const [hasMorePlaylists, setHasMorePlaylists] = useState(true);
  const [loadingMorePlaylists, setLoadingMorePlaylists] = useState(false);
  const isPlaylistLoadingRef = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('songs');

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch lecturer details
  useEffect(() => {
    fetchLecturerDetails();
    fetchLecturerLectures();
    fetchAlbums(); // Fetch albums on initial load to show correct count
  }, [lecturerId]);

  const fetchLecturerDetails = async () => {
    try {
      setLoading(true);
      const data = await lecturersApi.getLecturerDetails(lecturerId);

      // If we arrived here via name-hint flow (id=0), prefer showing the name hint
      // even if the underlying fetch returns "Unknown Lecturer".
      if (String(lecturerId) === '0' && lecturerNameHint.trim().length >= 2) {
        setLecturer({
          ...(data || {}),
          id: lecturerId,
          name: lecturerNameHint,
        });
      } else {
        setLecturer(data);
      }
    } catch (err) {
      console.error('Failed to fetch lecturer details:', err);
      setError('Failed to load lecturer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerLectures = async (page = 1, appendData = false) => {
    if (isLoadingRef.current) {
      console.log('⏸️ Already loading, skipping request');
      return;
    }

    try {
      isLoadingRef.current = true;

      if (page > 1 && !appendData) {
        console.warn(`⚠️ Page ${page} > 1 but appendData is false. Forcing append.`);
        appendData = true;
      }

      if (appendData) {
        setLoadingMore(true);
      } else {
        setLecturesLoading(true);
      }

      console.log(`📚 Fetching lectures for page ${page}`);

      // Fetch lectures by lecturer using the specific API endpoint
      const response = await lecturersApi.getLecturesByLecturer(lecturerId, page);

      console.log(`✅ Received ${response.data.length} lectures for page ${page}`);

      // Add unique ID to each lecture to prevent key collisions
      const lecturesWithUniqueIds = response.data.map((lecture, idx) => ({
        ...lecture,
        _uniqueId: `${lecture.nid}-${page}-${idx}-${Date.now()}`,
      }));

      if (appendData) {
        // Append new data to existing lectures, removing duplicates
        setLectures(prev => {
          const existingIds = new Set(prev.map(l => l.nid));
          const newLectures = lecturesWithUniqueIds.filter(l => !existingIds.has(l.nid));
          console.log(`➕ Adding ${newLectures.length} new lectures (${lecturesWithUniqueIds.length - newLectures.length} duplicates removed)`);
          console.log(`📊 Total lectures now: ${prev.length + newLectures.length}`);
          return [...prev, ...newLectures];
        });
      } else {
        // Replace lectures with new data
        console.log(`🔄 Replacing lectures with ${lecturesWithUniqueIds.length} items`);
        setLectures(lecturesWithUniqueIds);
      }

      // Check if there are more lectures to load
      // API returns 30 by default, if we get less than PAGE_SIZE, probably no more
      const hasMore = response.data.length >= PAGE_SIZE;
      console.log(`📊 Pagination status: Page ${page}, Has more: ${hasMore} (received ${response.data.length} lectures)`);
      setHasMoreLectures(hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch lecturer lectures:', err);
      setHasMoreLectures(false); // Stop trying to load more on error
    } finally {
      setLecturesLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  };

  const loadMoreLectures = () => {
    if (!hasMoreLectures || loadingMore || lecturesLoading || searchQuery || isLoadingRef.current) {
      console.log(`❌ Cannot load more - hasMore: ${hasMoreLectures}, loadingMore: ${loadingMore}, loading: ${lecturesLoading}, hasSearch: ${!!searchQuery}`);
      return;
    }
    console.log(`🔄 Loading more lectures - Current page: ${currentPage}, Next: ${currentPage + 1}`);
    fetchLecturerLectures(currentPage + 1, true);
  };

  const fetchAlbums = async (page = 1, appendData = false) => {
    if (isAlbumLoadingRef.current) return;

    try {
      isAlbumLoadingRef.current = true;
      if (appendData) {
        setLoadingMoreAlbums(true);
      } else {
        setAlbumsLoading(true);
      }

      addSentryBreadcrumb('Fetching albums for lecturer', 'http', {
        lecturerId,
        page,
        lecturerName: lecturer?.rpname || lecturer?.name,
      });

      const response = await albumsApi.getAlbumsByLecturer(lecturerId, page);
      
      if (appendData) {
        setAlbums(prev => {
           // Simple duplicate check by ID
           const existingIds = new Set(prev.map(a => a.id));
           const newAlbums = response.data.filter(a => !existingIds.has(a.id));
           return [...prev, ...newAlbums];
        });
      } else {
        setAlbums(response.data);
      }
      
      const hasMore = response.data.length >= PAGE_SIZE;
      setHasMoreAlbums(hasMore);
      setCurrentAlbumPage(page);

      console.log('✅ Loaded albums:', response.data.length, 'Page:', page);
      addSentryBreadcrumb('Albums loaded successfully', 'info', {
        lecturerId,
        albumCount: response.data.length,
        page
      });
    } catch (err: any) {
      console.error('Failed to fetch albums:', err);
      captureSentryException(err, {
        component: 'LecturerDetailScreen',
        action: 'fetchAlbums',
        lecturerId,
        level: 'error',
      });
      setHasMoreAlbums(false);
    } finally {
      setAlbumsLoading(false);
      setLoadingMoreAlbums(false);
      isAlbumLoadingRef.current = false;
    }
  };

  const loadMoreAlbums = () => {
    if (!hasMoreAlbums || loadingMoreAlbums || albumsLoading || isAlbumLoadingRef.current) return;
    fetchAlbums(currentAlbumPage + 1, true);
  };

  const fetchPlaylists = async (page = 1, appendData = false) => {
    if (isPlaylistLoadingRef.current) return;

    // Need lecturer name to search
    const queryName = lecturer?.rpname || lecturer?.name;
    if (!queryName) {
      setPlaylistsLoading(false);
      return;
    }

    try {
      isPlaylistLoadingRef.current = true;
      if (appendData) {
        setLoadingMorePlaylists(true);
      } else {
        setPlaylistsLoading(true);
      }

      addSentryBreadcrumb('Fetching playlists for lecturer', 'http', {
        lecturerId,
        queryName,
        page,
      });

      const response = await searchApi.searchPlaylists(queryName, page);
      
      if (appendData) {
        setPlaylists(prev => {
           const existingIds = new Set(prev.map(p => p.id));
           const newPlaylists = response.data.filter(p => !existingIds.has(p.id));
           return [...prev, ...newPlaylists];
        });
      } else {
        setPlaylists(response.data);
      }
      
      const hasMore = response.data.length >= PAGE_SIZE;
      setHasMorePlaylists(hasMore);
      setCurrentPlaylistPage(page);

      console.log('✅ Loaded playlists:', response.data.length, 'Page:', page);
    } catch (err: any) {
      console.error('Failed to fetch playlists:', err);
      // Don't show full error for empty search results
      setHasMorePlaylists(false);
    } finally {
      setPlaylistsLoading(false);
      setLoadingMorePlaylists(false);
      isPlaylistLoadingRef.current = false;
    }
  };

  const loadMorePlaylists = () => {
    if (!hasMorePlaylists || loadingMorePlaylists || playlistsLoading || isPlaylistLoadingRef.current) return;
    fetchPlaylists(currentPlaylistPage + 1, true);
  };

  // Fetch playlists when tab changes
  useEffect(() => {
    if (activeTab === 'playlists' && playlists.length === 0 && !playlistsLoading && (lecturer?.rpname || lecturer?.name)) {
      fetchPlaylists();
    }
  }, [activeTab, lecturer]);

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Handle search with debouncing for better performance
  const filteredLectures = useMemo(() => {
    if (debouncedSearchQuery.trim() === "") {
      return lectures;
    }

    const lowerSearch = debouncedSearchQuery.toLowerCase();
    return lectures.filter(lecture => {
      const title = lecture.title || "";
      const lecturerName = lecture.rpname || "";
      return (
        title.toLowerCase().includes(lowerSearch) ||
        lecturerName.toLowerCase().includes(lowerSearch)
      );
    });
  }, [debouncedSearchQuery, lectures]);

  // Update hasMoreLectures based on search state
  useEffect(() => {
    if (debouncedSearchQuery.trim() !== "") {
      setHasMoreLectures(false); // Disable pagination during search
    } else {
      // Re-enable pagination when search is cleared (if lectures list is not exhausted)
      setHasMoreLectures(lectures.length >= PAGE_SIZE);
    }
  }, [debouncedSearchQuery, lectures.length]);

  const convertToEpisode = (lecture: LecturerLecture): Episode => {
    const parseDuration = (duration: string | undefined): number => {
      if (!duration) return 0;
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    const id = String(lecture.nid || `lecture-${Date.now()}`);
    const title = lecture.title || "Untitled Lecture";
    const duration = lecture.duration;
    const audioUrl = lecture.audio || '';
    const coverUrl = lecture.img || lecture.rp_image || '';
    const plays = lecture.views || 0;

    return {
      id,
      title,
      durationSec: parseDuration(duration),
      coverUrl,
      audioUrl,
      seriesId: '',
      plays,
      liked: false,
      language: lecture.lang || "Unknown",
      downloads: lecture.downloads || 0,
      createdAt: new Date().toISOString(),
      lecturerName: lecture.rpname || lecturerName, // Include lecturer name from the lecture data
    };
  };

  const handleLecturePlay = (lecture: LecturerLecture) => {
    const episode = convertToEpisode(lecture);
    playEpisode(episode);
  };

  const handleLectureCardPress = (lecture: LecturerLecture) => {
    // Navigate to lecture detail page
    router.push(`/lecture/${lecture.nid}`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#0A0A0F]`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
          <Text style={tw`text-white mt-4`}>Loading lecturer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lecturer) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#0A0A0F]`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Text style={tw`text-white text-lg mb-4`}>Failed to load lecturer</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`bg-[#1F2937] px-6 py-3 rounded-lg`}
          >
            <Text style={tw`text-white`}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lecturerName = lecturer.rpname || lecturer.name || 'Unknown Lecturer';
  const lecturerImage = lecturer.img || lecturer.image || lecturer.avatarUrl;
  const favorites = lecturer.favorites || 1400;
  const shares = lecturer.share || 23;
  const comments = lecturer.comment || 44;

  // Define tabs
  const tabs = [
    { key: 'songs' as TabType, title: 'Lectures', count: lectures.length },
    { key: 'albums' as TabType, title: 'Albums', count: albums.length },
    { key: 'playlists' as TabType, title: 'Playlists', count: playlists.length },
  ];

  const renderAlbumItem = ({ item }: { item: Album }) => {
    const handleAlbumPress = () => {
      try {
        addSentryBreadcrumb('Album pressed', 'user', {
          albumId: item.id,
          albumTitle: item.title,
          lecturerId,
          lecturerName: lecturer?.rpname || lecturer?.name,
        });

        console.log('📀 Navigating to album:', item.id, item.title);

        // Navigate to album detail page
        router.push(`/album/${item.id}`);
      } catch (err: any) {
        console.error('Album press error:', err);
        captureSentryException(err, {
          component: 'LecturerDetailScreen',
          action: 'handleAlbumPress',
          albumId: item.id,
        });
      }
    };

    return (
      <TouchableOpacity
        style={tw`flex-row items-start p-4 bg-[#1A1A1F] rounded-lg mb-3`}
        onPress={handleAlbumPress}
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={tw`w-16 h-16 rounded-lg`}
          />
        ) : (
          <View style={tw`w-16 h-16 rounded-lg bg-gray-700 items-center justify-center`}>
            <Ionicons name="musical-notes" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={tw`flex-1 ml-4`}>
          <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={tw`text-gray-400 text-sm`}>
            {item.trackCount || 0} lectures{item.language ? ` • ${item.language}` : ''}
          </Text>
        </View>
        <View style={tw`justify-center ml-2`}>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLectureItem = (lecture: LecturerLecture, index: number) => (
    <TouchableOpacity
      key={lecture.nid || index}
      style={tw`flex-row items-center py-3 border-b border-gray-800`}
      onPress={() => handleLectureCardPress(lecture)}
    >
      {/* Track Number */}
      <Text style={tw`text-gray-400 w-8 text-center mr-2`}>
        {index + 1}
      </Text>

      {/* Thumbnail */}
      {lecture.img ? (
        <Image
          source={{ uri: lecture.img }}
          style={tw`w-12 h-12 rounded`}
        />
      ) : (
        <View style={tw`w-12 h-12 rounded bg-gray-700 items-center justify-center`}>
          <Ionicons name="musical-note" size={20} color="#9CA3AF" />
        </View>
      )}

      {/* Title and Info */}
      <View style={tw`flex-1 ml-3`}>
        <Text style={tw`text-white font-medium mb-1`} numberOfLines={2}>
          {lecture.title || 'Untitled'}
        </Text>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-gray-400 text-xs mr-3`} numberOfLines={1}>
            {lecture.rpname}
          </Text>
          <View style={tw`flex-row items-center mr-3`}>
            <Ionicons name="play" size={12} color="#9CA3AF" />
            <Text style={tw`text-gray-400 text-xs ml-1`}>
              {formatNumber(lecture.views)}
            </Text>
          </View>
          {lecture.favorites > 0 && (
            <View style={tw`flex-row items-center`}>
              <Ionicons name="heart" size={12} color="#9CA3AF" />
              <Text style={tw`text-gray-400 text-xs ml-1`}>
                {formatNumber(lecture.favorites)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Duration */}
      <Text style={tw`text-gray-400 text-sm mr-3`}>
        {lecture.duration || '00:00'}
      </Text>

      {/* Play Button Only */}
      <TouchableOpacity
        style={tw`p-2`}
        onPress={(e) => {
          e.stopPropagation();
          handleLecturePlay(lecture);
        }}
      >
        <Ionicons name="play-circle" size={28} color="#30D158" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderLectureFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
        <Text style={tw`text-gray-400 mt-2 text-xs`}>Loading more...</Text>
      </View>
    );
  };

  const renderAlbumFooter = () => {
    if (!loadingMoreAlbums) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
        <Text style={tw`text-gray-400 mt-2 text-xs`}>Loading more albums...</Text>
      </View>
    );
  };

  const renderPlaylistFooter = () => {
    if (!loadingMorePlaylists) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
        <Text style={tw`text-gray-400 mt-2 text-xs`}>Loading more playlists...</Text>
      </View>
    );
  };

  const renderPlaylistItem = ({ item }: { item: SearchPlaylist }) => {
    const handlePlaylistPress = () => {
      // Navigate to playlist detail page
      router.push(`/playlist/${item.id}`);
    };

    return (
      <TouchableOpacity
        style={tw`flex-row items-start p-4 bg-[#1A1A1F] rounded-lg mb-3`}
        onPress={handlePlaylistPress}
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={tw`w-16 h-16 rounded-lg`}
          />
        ) : (
          <View style={tw`w-16 h-16 rounded-lg bg-gray-700 items-center justify-center`}>
            <Ionicons name="list" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={tw`flex-1 ml-4`}>
          <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={tw`text-gray-400 text-sm`}>
            {item.itemCount || 0} items{item.userName ? ` • by ${item.userName}` : ''}
          </Text>
        </View>
        <View style={tw`justify-center ml-2`}>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlaylistsList = () => {
    if (playlistsLoading) {
        return (
          <View style={tw`py-10 items-center`}>
            <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
            <Text style={tw`text-gray-400 mt-2`}>Loading playlists...</Text>
          </View>
        );
    }
    
    if (playlists.length === 0) {
       return (
          <View style={tw`py-10 items-center`}>
            <Text style={tw`text-gray-400 text-center`}>
              No playlists found for this scholar
            </Text>
          </View>
        );
    }

    return (
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={tw`px-5 pb-20`}
        onEndReached={loadMorePlaylists}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeaderContent}
        ListFooterComponent={renderPlaylistFooter}
        scrollEnabled={false}
      />
    );
  };

  const renderHeaderContent = () => (
    <>
      {/* Lecturer Info with Cover Image */}
      <View style={tw`px-5 py-3`}>
        <View style={tw`flex-row`}>
          {/* Cover/Profile Image */}
          {lecturerImage ? (
            <Image
              source={{ uri: lecturerImage }}
              style={tw`w-24 h-24 rounded-lg`}
            />
          ) : (
            <View
              style={[
                tw`w-24 h-24 rounded-lg items-center justify-center`,
                { backgroundColor: getPlaceholderColor(lecturerId) }
              ]}
            >
              <Text style={tw`text-white text-3xl font-bold`}>
                {getInitials(lecturerName)}
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={tw`flex-1 ml-4 justify-between`}>
            <View>
              <Text style={tw`text-white text-xl font-bold mb-1`}>
                {lecturerName}
              </Text>
              {lecturer.bio && (
                <Text style={tw`text-gray-300 text-sm`} numberOfLines={2}>
                  {lecturer.bio}
                </Text>
              )}
            </View>

            {/* Stats */}
            <View style={tw`flex-row items-center mt-2`}>
              <View style={tw`flex-row items-center bg-gray-800 rounded-full px-3 py-1.5 mr-2`}>
                <Ionicons name="heart" size={14} color="#9CA3AF" />
                <Text style={tw`text-gray-300 text-xs ml-1.5`}>
                  {formatNumber(favorites)}
                </Text>
              </View>
              <View style={tw`flex-row items-center bg-gray-800 rounded-full px-3 py-1.5 mr-2`}>
                <Ionicons name="share-social" size={14} color="#9CA3AF" />
                <Text style={tw`text-gray-300 text-xs ml-1.5`}>
                  {shares}
                </Text>
              </View>
              <View style={tw`flex-row items-center bg-gray-800 rounded-full px-3 py-1.5`}>
                <Ionicons name="chatbubble" size={14} color="#9CA3AF" />
                <Text style={tw`text-gray-300 text-xs ml-1.5`}>
                  {comments}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
      />

      {/* Search Bar */}
      {activeTab === 'songs' && (
        <View style={tw`px-5 py-4`}>
          <View style={tw`flex-row items-center bg-[#1A1A1F] rounded-lg px-4 py-3`}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={tw`flex-1 ml-3 text-white`}
              placeholder="Search lectures"
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </>
  );

  const renderSongsList = () => {
    return (
      <FlatList
        data={filteredLectures}
        renderItem={({ item, index }) => renderLectureItem(item, index)}
        keyExtractor={(item: any, index: number) => item._uniqueId || `${item.nid}-${index}`}
        contentContainerStyle={tw`pb-20`}
        onEndReached={loadMoreLectures}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeaderContent}
        ListFooterComponent={renderLectureFooter}
        ListEmptyComponent={() => {
          if (lecturesLoading) {
            return (
              <View style={tw`px-5 py-10 items-center`}>
                <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
                <Text style={tw`text-gray-400 mt-2`}>Loading lectures...</Text>
              </View>
            );
          }
          return (
            <View style={tw`px-5 py-10 items-center`}>
              <Text style={tw`text-gray-400 text-center`}>
                {searchQuery ? 'No lectures found matching your search' : 'No lectures found for this scholar'}
              </Text>
            </View>
          );
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
      />
    );
  };
  
  const renderAlbumsList = () => {
    return (
        <FlatList
            data={albums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={tw`pb-20`}
            onEndReached={loadMoreAlbums}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={renderHeaderContent}
            ListFooterComponent={renderAlbumFooter}
            ListEmptyComponent={() => {
              if (albumsLoading) {
                return (
                  <View style={tw`py-10 items-center`}>
                    <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
                    <Text style={tw`text-gray-400 mt-2`}>Loading albums...</Text>
                  </View>
                );
              }
              return (
                <View style={tw`py-10 items-center`}>
                  <Text style={tw`text-gray-400 text-center`}>
                    No albums found for this scholar
                  </Text>
                </View>
              );
            }}
        />
    )
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: designTokens.colors.system.background.primary }]}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 py-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 items-center justify-center rounded-full`}
        >
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>

        <Text variant="title3" weight="bold" color="label" style={tw`flex-1 text-center mr-10`}>
          {lecturerName}
        </Text>
      </View>

      {activeTab === 'songs' ? renderSongsList() : activeTab === 'albums' ? renderAlbumsList() : renderPlaylistsList()}
    </SafeAreaView>
  );
}
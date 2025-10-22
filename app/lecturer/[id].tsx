import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Image, ActivityIndicator, TextInput, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { TabView } from "../../src/components/molecules/TabView";
import { usePlayerStore } from "../../src/stores";
import { lecturersApi, LecturerLecture } from "../../src/services/api/lecturers.api";
import { albumsApi, Album } from "../../src/services/api/albums.api";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode } from "../../src/types/types";
import { getInitials, getPlaceholderColor } from "../../src/utils/colorPlaceholder";

// Tab types
type TabType = 'songs' | 'albums' | 'playlists';

export default function LecturerDetailScreen() {
  const { id } = useLocalSearchParams();
  const lecturerId = id as string;
  const { playEpisode } = usePlayerStore();

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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('songs');

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLectures, setFilteredLectures] = useState<LecturerLecture[]>([]);

  // Fetch lecturer details
  useEffect(() => {
    fetchLecturerDetails();
    fetchLecturerLectures();
  }, [lecturerId]);

  const fetchLecturerDetails = async () => {
    try {
      setLoading(true);
      const data = await lecturersApi.getLecturerDetails(lecturerId);
      setLecturer(data);
    } catch (err) {
      console.error('Failed to fetch lecturer details:', err);
      setError('Failed to load lecturer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerLectures = async (page = 1, appendData = false) => {
    try {
      if (!appendData) {
        setLecturesLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Fetch lectures by lecturer using the specific API endpoint
      const response = await lecturersApi.getLecturesByLecturer(lecturerId, page);

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
          return [...prev, ...newLectures];
        });
        if (searchQuery.trim() === "") {
          setFilteredLectures(prev => {
            const existingIds = new Set(prev.map(l => l.nid));
            const newLectures = lecturesWithUniqueIds.filter(l => !existingIds.has(l.nid));
            return [...prev, ...newLectures];
          });
        }
      } else {
        // Replace lectures with new data
        setLectures(lecturesWithUniqueIds);
        setFilteredLectures(lecturesWithUniqueIds);
      }

      // Check if there are more lectures to load
      // If we got less data than expected or empty array, no more data
      setHasMoreLectures(response.data.length > 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch lecturer lectures:', err);
    } finally {
      setLecturesLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreLectures = () => {
    if (!loadingMore && hasMoreLectures && !searchQuery) {
      fetchLecturerLectures(currentPage + 1, true);
    }
  };

  const fetchAlbums = async () => {
    try {
      setAlbumsLoading(true);
      const response = await albumsApi.getAlbumsByLecturer(lecturerId);
      setAlbums(response.data);
    } catch (err) {
      console.error('Failed to fetch albums:', err);
    } finally {
      setAlbumsLoading(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (lecturer && activeTab === 'albums' && albums.length === 0) {
      fetchAlbums();
    }
  }, [activeTab, lecturer]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLectures(lectures);
      setHasMoreLectures(true); // Re-enable pagination when search is cleared
    } else {
      const filtered = lectures.filter(lecture => {
        const title = lecture.title || "";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredLectures(filtered);
      setHasMoreLectures(false); // Disable pagination during search
    }
  }, [searchQuery, lectures]);

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
    { key: 'playlists' as TabType, title: 'Playlists', count: 0 },
  ];

  const renderAlbumItem = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={tw`flex-row items-center p-4 bg-[#1A1A1F] rounded-lg mb-3`}
      onPress={() => {
        // TODO: Navigate to album detail when route is created
        // router.push(`/album/${album.id}`);
        console.log('Album pressed:', album.id);
      }}
    >
      {album.coverUrl ? (
        <Image
          source={{ uri: album.coverUrl }}
          style={tw`w-16 h-16 rounded-lg`}
        />
      ) : (
        <View style={tw`w-16 h-16 rounded-lg bg-gray-700 items-center justify-center`}>
          <Ionicons name="musical-notes" size={24} color="#9CA3AF" />
        </View>
      )}
      <View style={tw`flex-1 ml-4`}>
        <Text style={tw`text-white font-semibold mb-1`} numberOfLines={1}>
          {album.title}
        </Text>
        <Text style={tw`text-gray-400 text-sm`}>
          {album.trackCount || 0} tracks
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'songs':
        if (lecturesLoading) {
          return (
            <View style={tw`px-5 py-10 items-center`}>
              <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
              <Text style={tw`text-gray-400 mt-2`}>Loading lectures...</Text>
            </View>
          );
        }

        if (filteredLectures.length === 0) {
          return (
            <View style={tw`px-5 py-10 items-center`}>
              <Text style={tw`text-gray-400 text-center`}>
                {searchQuery ? 'No lectures found matching your search' : 'No lectures found for this scholar'}
              </Text>
            </View>
          );
        }

        return (
          <FlatList
            data={filteredLectures}
            renderItem={({ item, index }) => renderLectureItem(item, index)}
            keyExtractor={(item: any) => item._uniqueId || `${item.nid}-${index}`}
            contentContainerStyle={tw`px-5 pb-20`}
            onEndReached={loadMoreLectures}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderLectureFooter}
            scrollEnabled={false}
            removeClippedSubviews={true}
          />
        );

      case 'albums':
        return (
          <View style={tw`px-5 pb-20`}>
            {albumsLoading ? (
              <View style={tw`py-10 items-center`}>
                <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
                <Text style={tw`text-gray-400 mt-2`}>Loading albums...</Text>
              </View>
            ) : albums.length > 0 ? (
              albums.map(album => renderAlbumItem(album))
            ) : (
              <View style={tw`py-10 items-center`}>
                <Text style={tw`text-gray-400 text-center`}>
                  No albums found for this scholar
                </Text>
              </View>
            )}
          </View>
        );

      case 'playlists':
        return (
          <View style={tw`px-5 py-10 items-center`}>
            <Text style={tw`text-gray-400 text-center`}>
              Playlists feature coming soon
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#0A0A0F]`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-5 py-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`w-10 h-10 items-center justify-center rounded-full`}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={tw`text-white text-xl font-bold flex-1 text-center mr-10`}>
          {lecturerName}
        </Text>
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
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
                placeholder="Search within tracks"
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

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
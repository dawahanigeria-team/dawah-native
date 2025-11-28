import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Text } from "../../src/components/atoms";
import { ApiError } from "../../src/services/api/base.api";
import { lectureDetailApi } from "../../src/services/api/lectureDetail.api";
import { playlistApi } from "../../src/services/api/playlist.api";
import { useAuthStore } from "../../src/stores/authStore";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { SearchLecture } from "../../src/types/api.types";

const PlaylistDetailScreen: React.FC = () => {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const playlistId = id ?? "";
  const { isAuthenticated, user } = useAuthStore();

  const [playlistName] = useState(name || "");
  const [playlistContents, setPlaylistContents] = useState<SearchLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchPlaylistDetails = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      setError("Authentication required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await playlistApi.getPlaylistData(playlistId);
      if (response.success) {
        // The API returns { success: true, data: [ { audio: [id1, id2, ...] } ] }
        // We need to handle both potential structures if the API is inconsistent, 
        // but based on logs, it's response.data[0].audio
        const playlists = response.data || [];
        const currentPlaylist = playlists[0];
        // audio can be an array of numbers or strings
        const audioIds = currentPlaylist?.audio || [];

        if (!audioIds || audioIds.length === 0) {
          console.log("⚠️ Playlist is empty. Response data:", JSON.stringify(response));
          setPlaylistContents([]);
          setLoading(false);
          return;
        }
        console.log(`Found ${audioIds.length} audio IDs in playlist:`, audioIds);

        // Fetch details for each audio ID
        const lectureDetailsPromises = audioIds.map(async (audioId: number | string) => {
          try {
            console.log(`Fetching details for audio ID: ${audioId}`);
            const lectureDetail = await lectureDetailApi.getLectureDetail({ lectureId: audioId });
            console.log(`Successfully fetched details for audio ID: ${audioId}`);
            // Map LectureDetail to SearchLecture format
            const searchLecture: SearchLecture = {
              id: lectureDetail.id,
              nid: lectureDetail.id,
              Title: lectureDetail.title,
              audio: lectureDetail.audioUrl,
              duration: lectureDetail.durationLabel,
              img: lectureDetail.coverUrl,
              rpname: lectureDetail.lecturerName,
              lecturer_name: lectureDetail.lecturerName,
              lang: lectureDetail.language,
              cats: lectureDetail.categories.join(', '),
              favorites: Number(lectureDetail.favorites),
              share: Number(lectureDetail.shares),
              comment: Number(lectureDetail.comments),
              views: lectureDetail.views.toString(),
              downloads: lectureDetail.downloads.toString(),
              description: lectureDetail.description,
            };
            return searchLecture;
          } catch (lectureError) {
            console.error(`Error fetching details for audio ID ${audioId}:`, lectureError);
            return null; // Return null for failed fetches
          }
        });

        const fetchedLectures = (await Promise.all(lectureDetailsPromises)).filter(Boolean) as SearchLecture[];
        console.log(`Successfully loaded ${fetchedLectures.length} lectures out of ${audioIds.length} IDs`);
        setPlaylistContents(fetchedLectures);
      } else {
        setError(response.message || "Failed to fetch playlist contents.");
      }
    } catch (err) {
      console.error("Error fetching playlist contents:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, playlistId]);

  useEffect(() => {
    fetchPlaylistDetails();
  }, [fetchPlaylistDetails]);





  const handleRemoveAudio = useCallback(async (audioId: string) => {
    console.log(`Attempting to remove audio: ${audioId} from playlist: ${playlistId}`);

    // Optimistic update: Immediately remove the item from the list
    const previousContents = [...playlistContents];
    setPlaylistContents((prev) => {
      const newContents = prev.filter((item) => (item.id || item.nid?.toString()) !== audioId);
      console.log(`Optimistic update: ${prev.length} -> ${newContents.length} items`);
      return newContents;
    });

    try {
      await playlistApi.removeAudioFromPlaylist(playlistId, audioId);
      console.log("Audio removed successfully from API");
      // We don't need to re-fetch immediately as we've already updated the UI
      // and the cache is cleared by the service for the next visit.
    } catch (err) {
      console.error("Error removing audio from playlist:", err);
      // Revert the change if the API call fails
      setPlaylistContents(previousContents);

      if (err instanceof ApiError) {
        alert(err.message);
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("An unexpected error occurred while removing audio.");
      }
    }
  }, [playlistId, playlistContents]);


  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-zinc-900`}>
        <ActivityIndicator size="large" color={designTokens.colors.brand.primary} />
        <Text style={tw`mt-4 text-zinc-400`}>Loading playlist...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center px-8 bg-zinc-900`}>
        <Ionicons name="alert-circle-outline" size={64} color={designTokens.colors.semantic.red} />
        <Text style={tw`mt-4 text-lg font-bold text-white text-center`}>
          {error}
        </Text>
        <Button variant="filled" size="large" style={tw`mt-6`} onPress={() => router.back()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-zinc-900`}>
      <View style={tw`flex-row items-center p-4`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-4`}>
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.system.label.primary} />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold text-white`}>{playlistName || "Playlist"}</Text>

      </View>

      {playlistContents.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Ionicons name="musical-notes-outline" size={64} color={designTokens.colors.system.label.tertiary} />
          <Text style={tw`mt-4 text-zinc-400`}>This playlist is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={playlistContents}
          keyExtractor={(item: SearchLecture) => item.id || item.nid?.toString() || ''}
          renderItem={({ item }: { item: SearchLecture }) => (
            <TouchableOpacity
              style={tw`flex-row items-center p-4 border-b border-zinc-700`}
              onPress={() => {
                // Navigate to lecture detail or play audio
                router.push(`/lecture/${item.id || item.nid}`);
              }}
            >
              <Image
                source={{ uri: item.img || item.CoverUrl || "https://via.placeholder.com/50" }}
                style={tw`w-12 h-12 rounded-md mr-3`}
                contentFit="cover"
              />
              <View style={tw`flex-1`}>
                <Text style={tw`text-white font-semibold`}>{item.Title}</Text>
                <Text style={tw`text-zinc-400 text-sm`}>{item.lecturer_name || item.rpname}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveAudio(item.id || item.nid?.toString() || '')}
                style={tw`p-2`}
              >
                <Ionicons name="remove-circle" size={24} color={designTokens.colors.semantic.red} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color={designTokens.colors.system.label.tertiary} />
            </TouchableOpacity>
          )}
        />
      )}


    </SafeAreaView>
  );
};

export default PlaylistDetailScreen;

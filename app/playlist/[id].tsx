import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useGuardedPush } from "../../src/navigation/useGuardedPush";
import React, { useCallback, useEffect, useState } from "react";
import { FlashList } from "../../src/components/adapters/flashListCompat";
import {
  ActivityIndicator,
  Share,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Text } from "../../src/components/atoms";
import { LectureRow } from "../../src/components/molecules/LectureRow";
import { searchLectureToRow } from "../../src/components/molecules/lectureRowModel";
import { ScreenHeader } from "../../src/components/molecules/ScreenHeader";
import { ApiError } from "../../src/services/api/base.api";
import { lectureDetailApi } from "../../src/services/api/lectureDetail.api";
import { linkingService } from "../../src/services/linking.service";
import { playlistApi } from "../../src/services/api/playlist.api";
import { usePlayerActions } from "../../src/stores";
import { useAuthStore } from "../../src/stores/authStore";
import { useTheme } from "../../src/hooks/useTheme";
import tw from "../../src/theme/twrnc";
import { SearchLecture } from "../../src/types/api.types";
import { Episode } from "../../src/types/types";
import { appendShareSignature } from "../../src/utils/shareMessage";

const parseDuration = (duration: string | number | undefined): number => {
  if (typeof duration === "number") {
    return duration;
  }
  if (!duration || typeof duration !== "string") {
    return 0;
  }
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  const numericDuration = parseInt(duration, 10);
  return Number.isNaN(numericDuration) ? 0 : numericDuration;
};

const lectureToEpisode = (lecture: SearchLecture, index: number = 0): Episode => {
  const fallbackKey =
    lecture.audio ||
    lecture.mp3_url ||
    lecture.AudioUrl ||
    lecture.Title ||
    lecture.mp3_title ||
    `index-${index}`;
  const id = String(lecture.id || lecture.nid || `playlist-${index}-${fallbackKey}`);
  const title = lecture.Title || lecture.mp3_title || "Untitled Lecture";
  const duration = lecture.duration || lecture.mp3_duration || lecture.Duration;
  const audioUrl = lecture.audio || lecture.mp3_url || lecture.AudioUrl || "";
  const coverUrl = lecture.img || lecture.CoverUrl || "";
  const plays = parseInt(lecture.views || lecture.Plays || "0", 10) || 0;
  const language = lecture.lang || lecture.language || lecture.Language || "Unknown";
  const downloads =
    parseInt(lecture.downloads || lecture.Downloads || "0", 10) || 0;
  const createdAt =
    lecture.created_at ||
    lecture.CreatedAt ||
    (lecture as any).post_date ||
    (lecture as any).updated_date ||
    '';
  const lecturerName =
    lecture.lecturer_name || lecture.rpname || lecture.ResourcePerson || undefined;

  return {
    id,
    title,
    durationSec: parseDuration(duration),
    coverUrl,
    audioUrl,
    seriesId: "",
    plays,
    liked: false,
    language,
    downloads,
    createdAt,
    lecturerName,
    rpname: lecture.rpname,
    reciter_name: (lecture as SearchLecture & { reciter_name?: string }).reciter_name,
    isReciter: Boolean((lecture as SearchLecture & { is_reciter?: boolean }).is_reciter),
  };
};

const PlaylistDetailScreen: React.FC = () => {
  const guardedPush = useGuardedPush();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const playlistId = id ?? "";
  const { isAuthenticated, user } = useAuthStore();
  const { playQueue } = usePlayerActions();
  const { colors } = useTheme();

  const [playlistName] = useState(name || "");
  const [playlistContents, setPlaylistContents] = useState<SearchLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePlayAll = useCallback(async () => {
    if (playlistContents.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const episodes = playlistContents.map((lecture, index) => lectureToEpisode(lecture, index));
      await playQueue(episodes, 0, false);
    } catch (err) {
      console.error("Play all error:", err);
    }
  }, [playlistContents, playQueue]);

  const handleShuffle = useCallback(async () => {
    if (playlistContents.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const episodes = playlistContents.map((lecture, index) => lectureToEpisode(lecture, index));
      const startIndex = Math.floor(Math.random() * episodes.length);
      await playQueue(episodes, startIndex, true);
    } catch (err) {
      console.error("Shuffle error:", err);
    }
  }, [playlistContents, playQueue]);

  const handleShare = useCallback(async () => {
    if (!playlistId) return;
    const title = playlistName || "Dawahnigeria playlist";
    const webLink = linkingService.createPlaylistLink(playlistId);
    const message = appendShareSignature(
      `🎧 ${title}\n\nOpen this playlist in the Dawahnigeria app or listen on the web:\n${webLink}`,
    );

    try {
      await Share.share({ title, message, url: webLink });
    } catch (shareError) {
      console.warn("Failed to share playlist", shareError);
    }
  }, [playlistId, playlistName]);

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
      if (response.success && response.data) {
        const audioIds = response.data.flatMap((item: any) => item.audio || []);

        // Fetch details for each audio ID
        const lectureDetailsPromises = audioIds.map(async (audioId: number) => {
          try {
            const lectureDetail = await lectureDetailApi.getLectureDetail({ lectureId: audioId });
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
        setPlaylistContents(fetchedLectures);

        // Playlist name and privacy are now passed via navigation params
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
    queueMicrotask(() => {
      void fetchPlaylistDetails();
    });
  }, [fetchPlaylistDetails]);





  if (loading) {
    return (
      <SafeAreaView style={[tw`flex-1 items-center justify-center`, { backgroundColor: colors.system.background.primary }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={[tw`mt-4`, { color: colors.system.label.secondary }]}>Loading playlist...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[tw`flex-1 items-center justify-center px-8`, { backgroundColor: colors.system.background.primary }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.semantic.red} />
        <Text style={[tw`mt-4 text-lg font-bold text-center`, { color: colors.system.label.primary }]}>
          {error}
        </Text>
        <Button variant="filled" size="large" style={tw`mt-6`} onPress={() => router.back()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[tw`flex-1`, { backgroundColor: colors.system.background.primary }]}
    >
      <ScreenHeader
        title={playlistName || "Playlist"}
        actions={[{ icon: "share-outline", accessibilityLabel: "Share playlist", onPress: handleShare }]}
      />

      {playlistContents.length > 0 && (
        <View style={tw`flex-row gap-3 px-4 pb-3`}>
          <Button variant="filled" size="large" style={tw`flex-1`} onPress={handlePlayAll}>
            Play All
          </Button>
          <Button variant="plain" size="large" style={tw`flex-1`} onPress={handleShuffle}>
            Shuffle
          </Button>
        </View>
      )}

      {playlistContents.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Ionicons name="musical-notes-outline" size={64} color={colors.system.label.tertiary} />
          <Text style={[tw`mt-4`, { color: colors.system.label.secondary }]}>This playlist is empty.</Text>
        </View>
      ) : (
        <FlashList
          data={playlistContents}
          keyExtractor={(item: SearchLecture) => item.id || item.nid?.toString() || ''}
          renderItem={({ item }: { item: SearchLecture }) => (
            <LectureRow
              lecture={searchLectureToRow(item)}
              onPress={() => {
                guardedPush(`/lecture/${item.id || item.nid}`);
              }}
            />
          )}
        />
      )}


    </SafeAreaView>
  );
};

export default PlaylistDetailScreen;

import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Image, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Card } from "../../src/components/molecules/Card";
import { FilterSection } from "../../src/components/molecules/FilterSection";
import { usePlayerStore } from "../../src/stores";
import { lecturersApi } from "../../src/services/api/lecturers.api";
import { searchApi } from "../../src/services/api/search.api";
import { designTokens } from "../../src/theme/designTokens";
import tw from "../../src/theme/twrnc";
import { Episode } from "../../src/types/types";
import { SearchLecture } from "../../src/types/api.types";
import { getInitials, getPlaceholderColor } from "../../src/utils/colorPlaceholder";

// Language options for filtering
const languages = ["All", "English", "Hausa", "Yoruba", "Arabic", "Igbo", "Fulani"];
const categories = ["All", "Tafsir", "Hadith", "Fiqh", "Aqeedah", "History", "Ethics"];
const sortOptions = ["Latest", "Most Played", "Most Liked", "Oldest"];

export default function LecturerDetailScreen() {
  const { id } = useLocalSearchParams();
  const lecturerId = id as string;
  const { playEpisode } = usePlayerStore();

  // States
  const [lecturer, setLecturer] = useState<any>(null);
  const [lectures, setLectures] = useState<SearchLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Latest");

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

  const fetchLecturerLectures = async () => {
    try {
      setLecturesLoading(true);
      // Search for lectures by this lecturer
      const response = await searchApi.searchLectures(
        lecturer?.rpname || lecturer?.name || '',
        1,
        {
          language: selectedLanguage !== "All" ? selectedLanguage : undefined,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
        }
      );
      setLectures(response.data);
    } catch (err) {
      console.error('Failed to fetch lecturer lectures:', err);
    } finally {
      setLecturesLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    if (lecturer) {
      fetchLecturerLectures();
    }
  }, [selectedLanguage, selectedCategory, selectedSort]);

  const convertToEpisode = (lecture: SearchLecture): Episode => {
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

    const id = String(lecture.nid || lecture.id || `lecture-${Date.now()}`);
    const title = lecture.Title || lecture.mp3_title || "Untitled Lecture";
    const duration = lecture.duration || lecture.mp3_duration || lecture.Duration;
    const audioUrl = lecture.audio || lecture.mp3_url || lecture.AudioUrl || '';
    const coverUrl = lecture.img || lecture.lecturer_image || lecture.CoverUrl || '';
    const plays = parseInt(String(lecture.views || lecture.Plays || "0")) || 0;

    return {
      id,
      title,
      durationSec: parseDuration(duration),
      coverUrl,
      audioUrl,
      seriesId: '',
      plays,
      liked: false,
      language: lecture.lang || lecture.language || "Unknown",
      downloads: 0,
      createdAt: new Date().toISOString(),
    };
  };

  const handleLecturePress = (lecture: SearchLecture) => {
    const episode = convertToEpisode(lecture);
    playEpisode(episode);
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
  const totalLectures = lecturer.total_lectures || 0;
  const followers = lecturer.followers || 0;

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
          Scholar Profile
        </Text>
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Lecturer Info */}
        <View style={tw`items-center px-5 py-6`}>
          {lecturerImage ? (
            <Image
              source={{ uri: lecturerImage }}
              style={tw`w-32 h-32 rounded-full mb-4`}
            />
          ) : (
            <View
              style={[
                tw`w-32 h-32 rounded-full items-center justify-center mb-4`,
                { backgroundColor: getPlaceholderColor(lecturerId) }
              ]}
            >
              <Text style={tw`text-white text-4xl font-bold`}>
                {getInitials(lecturerName)}
              </Text>
            </View>
          )}

          <Text style={tw`text-white text-2xl font-bold mb-2`}>
            {lecturerName}
          </Text>

          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`items-center mx-6`}>
              <Text style={tw`text-white text-xl font-bold`}>
                {formatNumber(totalLectures)}
              </Text>
              <Text style={tw`text-gray-400 text-sm`}>Lectures</Text>
            </View>
            {followers > 0 && (
              <View style={tw`items-center mx-6`}>
                <Text style={tw`text-white text-xl font-bold`}>
                  {formatNumber(followers)}
                </Text>
                <Text style={tw`text-gray-400 text-sm`}>Followers</Text>
              </View>
            )}
          </View>

          {lecturer.bio && (
            <Text style={tw`text-gray-300 text-center text-sm px-4`}>
              {lecturer.bio}
            </Text>
          )}
        </View>

        {/* Filter Button */}
        <View style={tw`flex-row justify-between items-center px-5 mb-4`}>
          <Text style={tw`text-white text-lg font-semibold`}>
            Lectures ({lectures.length})
          </Text>

          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={tw`flex-row items-center px-4 py-2 bg-[#1F2937] rounded-full`}
          >
            <Ionicons name="options" size={18} color="#FFFFFF" />
            <Text style={tw`text-white text-sm ml-2`}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={tw`bg-[#111827] mx-3 rounded-lg p-4 mb-4`}>
            <FilterSection
              title="Language"
              options={languages}
              selectedValue={selectedLanguage}
              onSelect={setSelectedLanguage}
            />

            <FilterSection
              title="Category"
              options={categories}
              selectedValue={selectedCategory}
              onSelect={setSelectedCategory}
            />

            <FilterSection
              title="Sort By"
              options={sortOptions}
              selectedValue={selectedSort}
              onSelect={setSelectedSort}
            />
          </View>
        )}

        {/* Lectures */}
        <View style={tw`px-5 pb-20`}>
          {lecturesLoading ? (
            <View style={tw`py-10 items-center`}>
              <ActivityIndicator size="small" color={designTokens.colors.brand.primary} />
              <Text style={tw`text-gray-400 mt-2`}>Loading lectures...</Text>
            </View>
          ) : lectures.length > 0 ? (
            lectures.map((lecture) => (
              <View key={lecture.nid || lecture.id} style={tw`mb-4`}>
                <Card
                  variant="landscape"
                  data={convertToEpisode(lecture)}
                  onPress={() => handleLecturePress(lecture)}
                  showTime={true}
                  showMeta={true}
                  metaValue={`${lecture.views || 0} plays`}
                />
              </View>
            ))
          ) : (
            <View style={tw`py-10 items-center`}>
              <Text style={tw`text-gray-400 text-center`}>
                No lectures found for this scholar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
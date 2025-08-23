import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/twrnc';
import { HeroCarousel } from '../components/HeroCarousel';
import { ActionGrid } from '../components/ActionGrid';
import { Row } from '../components/Row';
import { Card } from '../components/Card';
import { SearchBar } from '../components/SearchBar';
import { usePlayer } from '../theme/PlayerContext';
import { Episode, Series } from '../types/types';

// Mock data - in a real app this would come from an API
const mockEpisodes: Episode[] = [
  {
    id: '1',
    title: 'Introduction to Tafsir Methodology',
    durationSec: 3600,
    coverUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio1.mp3',
    seriesId: '1',
    plays: 1250,
    liked: true
  },
  {
    id: '2',
    title: 'Understanding Surah Al-Fatiha',
    durationSec: 2700,
    coverUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio2.mp3',
    seriesId: '1',
    plays: 980,
    liked: false
  },
  {
    id: '3',
    title: 'Building Good Character in Daily Life',
    durationSec: 3300,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio3.mp3',
    seriesId: '2',
    plays: 756,
    liked: true
  },
  {
    id: '4',
    title: 'The Rights of Women in Islamic Law',
    durationSec: 4200,
    coverUrl: 'https://images.unsplash.com/photo-1487412720507-e7abf03fe3bf?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio4.mp3',
    seriesId: '3',
    plays: 892,
    liked: false
  },
  {
    id: '5',
    title: 'The Golden Age of Islamic Civilization',
    durationSec: 4800,
    coverUrl: 'https://images.unsplash.com/photo-1447069388813-9e89e38406f7?w=300&h=300&fit=crop',
    audioUrl: 'https://example.com/audio5.mp3',
    seriesId: '4',
    plays: 654,
    liked: true
  }
];

const mockSeries: Series[] = [
  {
    id: '1',
    title: 'Tafsir Al-Qur\'an',
    coverUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop',
    language: 'Hausa',
    tags: ['Tafsir', 'Qur\'an', 'Islamic Studies'],
    lecturerId: '1'
  },
  {
    id: '2',
    title: 'Akhlaq & Character Building',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop',
    language: 'English',
    tags: ['Akhlaq', 'Character', 'Ethics'],
    lecturerId: '2'
  },
  {
    id: '3',
    title: 'Women in Islam',
    coverUrl: 'https://images.unsplash.com/photo-1487412720507-e7abf03fe3bf?w=300&h=300&fit=crop',
    language: 'Yoruba',
    tags: ['Women', 'Islamic Rights', 'Empowerment'],
    lecturerId: '3'
  },
  {
    id: '4',
    title: 'Islamic History & Civilization',
    coverUrl: 'https://images.unsplash.com/photo-1447069388813-9e89e38406f7?w=300&h=300&fit=crop',
    language: 'Hausa',
    tags: ['History', 'Civilization', 'Islamic Heritage'],
    lecturerId: '4'
  }
];

export const HomeScreen: React.FC = () => {
  const { playEpisode } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');

  const handleEpisodePress = (episode: Episode) => {
    playEpisode(episode);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real app, this would trigger a search
  };

  const handleMicPress = () => {
    // In a real app, this would open voice search
    console.log('Voice search pressed');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-bg`}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0F" />
      
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-4 py-3`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`bg-dn w-8 h-8 rounded-lg items-center justify-center mr-3`}>
            <Text style={tw`text-bg font-bold text-lg`}>DN</Text>
          </View>
          <Text style={tw`text-text-primary text-xl font-bold`}>
            Dawah Nigeria
          </Text>
        </View>
        
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity style={tw`mr-4`}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        onMicPress={handleMicPress}
      />

      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
      >
        {/* Hero Carousel */}
        <HeroCarousel
          items={mockEpisodes.slice(0, 5)}
          onItemPress={handleEpisodePress}
        />

        {/* Action Grid */}
        <ActionGrid />

        {/* Recent Episodes */}
        <Row 
          title="Recent" 
          subTitle="Continue where you left off"
          onSeeAll={() => console.log('See all recent')}
        >
          {mockEpisodes.slice(0, 3).map((episode) => (
            <Card
              key={episode.id}
              variant="landscape"
              data={episode}
              onPress={() => handleEpisodePress(episode)}
              showTime={true}
              showMeta="Sheikh Ahmad Tijani"
            />
          ))}
        </Row>

        {/* Trending Series */}
        <Row 
          title="Trending" 
          onSeeAll={() => console.log('See all trending')}
        >
          {mockSeries.map((series) => (
            <Card
              key={series.id}
              variant="square"
              data={series}
              onPress={() => console.log('Series pressed:', series.title)}
              showBadge={true}
              badgeText="DN"
            />
          ))}
        </Row>

        {/* Quran Recitations */}
        <Row 
          title="Quran Recitations" 
          onSeeAll={() => console.log('See all Quran')}
        >
          {mockEpisodes.slice(0, 4).map((episode) => (
            <Card
              key={episode.id}
              variant="square"
              data={episode}
              onPress={() => handleEpisodePress(episode)}
              showMeta="reciterName"
              metaValue="Sheikh Usman Dan Fodio"
            />
          ))}
        </Row>
      </ScrollView>
    </SafeAreaView>
  );
};

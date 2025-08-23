import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import tw from '../theme/twrnc';
import { SearchBar } from '../components/SearchBar';
import { Chip } from '../components/Chip';
import { Card } from '../components/Card';
import { usePlayer } from '../theme/PlayerContext';
import { Episode, Series } from '../types/types';

const trendingTopics = ['Tafsir', 'Akhlaq', 'Aqidah', 'Salah', 'Qur\'an', 'Hadith'];

const mockSearchResults: (Episode | Series)[] = [
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
    title: 'Tafsir Al-Qur\'an',
    coverUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=300&fit=crop',
    language: 'Hausa',
    tags: ['Tafsir', 'Qur\'an', 'Islamic Studies'],
    lecturerId: '1'
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
  }
];

export const SearchScreen: React.FC = () => {
  const { playEpisode } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Episode | Series)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      // Simulate search delay
      setTimeout(() => {
        setSearchResults(mockSearchResults);
        setIsSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleChipPress = (topic: string) => {
    setSelectedChip(selectedChip === topic ? null : topic);
    setSearchQuery(topic);
    handleSearch(topic);
  };

  const handleItemPress = (item: Episode | Series) => {
    if ('durationSec' in item) {
      // It's an episode
      playEpisode(item);
    } else {
      // It's a series
      console.log('Series pressed:', item.title);
    }
  };

  const renderSearchResult = ({ item }: { item: Episode | Series }) => {
    if ('durationSec' in item) {
      // Episode
      return (
        <Card
          variant="landscape"
          data={item}
          onPress={() => handleItemPress(item)}
          showTime={true}
          showMeta="Sheikh Ahmad Tijani"
        />
      );
    } else {
      // Series
      return (
        <Card
          variant="square"
          data={item}
          onPress={() => handleItemPress(item)}
          showBadge={true}
          badgeText="DN"
        />
      );
    }
  };

  const renderEmptyState = () => (
    <View style={tw`flex-1 items-center justify-center py-20`}>
      <View style={tw`w-16 h-16 bg-surface rounded-full items-center justify-center mb-4`}>
        <Text style={tw`text-text-muted text-2xl`}>🔍</Text>
      </View>
      <Text style={tw`text-text-primary text-lg font-semibold mb-2`}>
        Nothing here yet
      </Text>
      <Text style={tw`text-text-muted text-center px-8`}>
        Type to search DN content
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-bg`}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0F" />
      
      {/* Header */}
      <View style={tw`px-4 py-3`}>
        <Text style={tw`text-text-primary text-2xl font-bold`}>
          Search
        </Text>
      </View>

      {/* Sticky Search Bar */}
      <View style={tw`px-4 pb-4`}>
        <SearchBar
          placeholder="Try: Suratul Ikhlas"
          onSearch={handleSearch}
          onMicPress={() => console.log('Voice search')}
        />
      </View>

      <ScrollView 
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
      >
        {/* Trending Chips */}
        <View style={tw`px-4 mb-6`}>
          <Text style={tw`text-text-primary text-lg font-semibold mb-3`}>
            Trending Topics
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {trendingTopics.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                variant="outline"
                selected={selectedChip === topic}
                onPress={() => handleChipPress(topic)}
              />
            ))}
          </View>
        </View>

        {/* Recent Searches */}
        {searchQuery.length === 0 && (
          <View style={tw`px-4 mb-6`}>
            <Text style={tw`text-text-primary text-lg font-semibold mb-3`}>
              Recent Searches
            </Text>
            <View style={tw`bg-card rounded-2xl p-4`}>
              <Text style={tw`text-text-muted text-sm`}>
                No recent searches yet
              </Text>
            </View>
          </View>
        )}

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={tw`px-4`}>
            <Text style={tw`text-text-primary text-lg font-semibold mb-3`}>
              Search Results
            </Text>
            {isSearching ? (
              <View style={tw`items-center py-8`}>
                <Text style={tw`text-text-muted`}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View>
                {searchResults.map((item) => (
                  <View key={item.id} style={tw`mb-3`}>
                    {renderSearchResult({ item })}
                  </View>
                ))}
              </View>
            ) : (
              renderEmptyState()
            )}
          </View>
        )}

        {/* Empty State when no search */}
        {searchQuery.length === 0 && (
          <View style={tw`flex-1 items-center justify-center py-20`}>
            <View style={tw`w-16 h-16 bg-surface rounded-full items-center justify-center mb-4`}>
              <Text style={tw`text-text-muted text-2xl`}>🔍</Text>
            </View>
            <Text style={tw`text-text-primary text-lg font-semibold mb-2`}>
              Start exploring
            </Text>
            <Text style={tw`text-text-muted text-center px-8`}>
              Search for Qur'an, Tafsir, Lectures, and more
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

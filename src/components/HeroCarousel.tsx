import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "../theme/twrnc";
import { Episode } from "../types/types";
import { formatDuration } from "../utils/formatTime";

interface HeroCarouselProps {
  items: Episode[];
  height?: number;
  autoplay?: boolean;
  onItemPress?: (item: Episode) => void;
}

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth - 48; // 24px padding on each side
const CARD_HEIGHT = 180;

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  items,
  height = CARD_HEIGHT,
  autoplay = true,
  onItemPress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % items.length;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * CARD_WIDTH,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, items.length, autoplay]);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / CARD_WIDTH);
    setCurrentIndex(index);
  };

  const renderItem = (item: Episode, index: number) => {
    return (
      <View key={item.id} style={[tw`mr-6`, { width: CARD_WIDTH, height }]}>
        <TouchableOpacity
          style={tw`flex-1`}
          onPress={() => onItemPress?.(item)}
          activeOpacity={0.9}
        >
          <View style={tw`flex-1 relative rounded-3xl overflow-hidden`}>
            <Image
              source={{ uri: item.coverUrl }}
              style={tw`w-full h-full`}
              contentFit="cover"
            />

            {/* Gradient overlay */}
            <View
              style={tw`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent`}
            />

            {/* Content */}
            <View style={tw`absolute bottom-0 left-0 right-0 p-4`}>
              <View style={tw`flex-row items-center mb-2`}>
                <View style={tw`bg-dn px-2 py-1 rounded-full mr-2`}>
                  <Text style={tw`text-bg text-xs font-bold`}>DN</Text>
                </View>
                <Text style={tw`text-white/80 text-xs`}>
                  {formatDuration(item.durationSec)}
                </Text>
              </View>

              <Text
                style={tw`text-white text-lg font-bold leading-6`}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>

            {/* Play button */}
            <View style={tw`absolute top-4 right-4`}>
              <View style={tw`bg-white/20 backdrop-blur-lg rounded-full p-2`}>
                <Ionicons name="play" size={20} color="white" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={tw`mb-6`}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-6`}
        snapToInterval={CARD_WIDTH + 24}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => renderItem(item, index))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={tw`flex-row justify-center mt-4`}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[
              tw`w-2 h-2 rounded-full mx-1`,
              index === currentIndex ? tw`bg-dn` : tw`bg-text-muted/30`,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

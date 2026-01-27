import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "expo-sqlite/kv-store";
import { Text } from "../components/atoms";
import { designTokens } from "../theme/designTokens";
import tw from "../theme/twrnc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: readonly [string, string, ...string[]];
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: "book-outline",
    title: "Discover Islamic Knowledge",
    description:
      "Access thousands of lectures, Quran recitations, and Islamic content from renowned scholars across Nigeria and beyond",
    gradient: [designTokens.colors.brand.primary, designTokens.colors.brand.secondary],
  },
  {
    id: 2,
    icon: "headset-outline",
    title: "Listen Anywhere",
    description:
      "Download lectures for offline listening, create playlists, and enjoy seamless playback with background audio support",
    gradient: [designTokens.colors.brand.secondary, designTokens.colors.semantic.indigo],
  },
  {
    id: 3,
    icon: "people-outline",
    title: "Learn from the Best",
    description:
      "Follow your favorite scholars, discover trending lectures, and build your personal library of Islamic knowledge",
    gradient: [designTokens.colors.semantic.indigo, designTokens.colors.semantic.purple],
  },
  {
    id: 4,
    icon: "rocket-outline",
    title: "Start Your Journey",
    description:
      "Join thousands of Muslims learning and growing together. Your path to knowledge begins here",
    gradient: [designTokens.colors.semantic.purple, designTokens.colors.brand.primary],
  },
];

const PageIndicator = ({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) => {
  return (
    <View style={tw`flex-row items-center gap-2`}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              tw`rounded-full`,
              {
                width: isActive ? 24 : 8,
                height: 8,
                backgroundColor: isActive
                  ? designTokens.colors.brand.primary
                  : designTokens.colors.system.fill.tertiary,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const OnboardingSlideComponent = ({
  item,
}: {
  item: OnboardingSlide;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <View
      style={[
        tw`flex-1 items-center justify-center px-8`,
        { width: SCREEN_WIDTH },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            tw`rounded-full items-center justify-center mb-12`,
            {
              width: SCREEN_WIDTH * 0.5,
              height: SCREEN_WIDTH * 0.5,
              maxWidth: 240,
              maxHeight: 240,
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={100}
            color={designTokens.colors.system.background.primary}
          />
        </LinearGradient>
      </Animated.View>

      <Text
        variant="largeTitle"
        weight="bold"
        color="label"
        style={{ textAlign: "center", marginBottom: 16 }}
      >
        {item.title}
      </Text>

      <Text
        variant="body"
        color="secondaryLabel"
        style={{
          textAlign: "center",
          lineHeight: 24,
          maxWidth: 340,
        }}
      >
        {item.description}
      </Text>
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setCurrentIndex(slideIndex);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      router.replace("/(tabs)");
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        { backgroundColor: designTokens.colors.system.background.primary },
      ]}
      edges={['top', 'bottom']}
    >
      {!isLastSlide && (
        <View 
          style={[
            tw`absolute right-6 z-10`,
            { top: Math.max(insets.top, 16) }
          ]}
        >
          <Pressable
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              variant="headline"
              weight="semibold"
              style={{ color: designTokens.colors.system.label.secondary }}
            >
              Skip
            </Text>
          </Pressable>
        </View>
      )}

      <View style={tw`flex-1`}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          {slides.map((slide) => (
            <OnboardingSlideComponent key={slide.id} item={slide} />
          ))}
        </ScrollView>
      </View>

      <View style={tw`px-6 pb-8`}>
        <View style={tw`items-center mb-8`}>
          <PageIndicator count={slides.length} activeIndex={currentIndex} />
        </View>

        <View style={tw`gap-3`}>
          <Pressable
            onPress={handleNext}
            style={[
              tw`rounded-full py-4 items-center justify-center`,
              {
                backgroundColor: designTokens.colors.brand.primary,
                minHeight: designTokens.hitTargets.minimum,
              },
            ]}
          >
            <Text
              variant="headline"
              weight="semibold"
              style={{ color: designTokens.colors.system.background.primary }}
            >
              {isLastSlide ? "Get Started" : "Next"}
            </Text>
          </Pressable>

          {isLastSlide && (
            <Pressable
              onPress={() => router.push("/sign-in")}
              style={[
                tw`rounded-full py-4 items-center justify-center`,
                {
                  backgroundColor:
                    designTokens.colors.system.background.secondary,
                  minHeight: designTokens.hitTargets.minimum,
                },
              ]}
            >
              <Text
                variant="headline"
                weight="semibold"
                style={{ color: designTokens.colors.system.label.primary }}
              >
                Sign In
              </Text>
            </Pressable>
          )}
        </View>

        {isLastSlide && (
          <View style={tw`mt-6 items-center`}>
            <Text
              variant="caption2"
              color="tertiaryLabel"
              style={{ textAlign: "center", lineHeight: 18 }}
            >
              By continuing, you agree to our{" "}
              <Text
                variant="caption2"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                variant="caption2"
                style={{ color: designTokens.colors.brand.primary }}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

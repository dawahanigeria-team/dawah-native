# Bolt's Journal

## 2026-01-01 - [Optimized HeroCarousel with FlatList and Memoization]
**Learning:** Replaced `ScrollView` with `FlatList` in `HeroCarousel` to improve performance by virtualizing items. Extracted item rendering to `HeroCarouselItem` wrapped in `React.memo` to prevent unnecessary re-renders. This pattern is crucial for horizontal lists in React Native to ensure scalability and smooth scrolling.
**Action:** Apply `FlatList` + `memo` pattern to other horizontal lists (like in `Row` component) if they grow in size or complexity.

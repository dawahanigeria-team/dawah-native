# Bolt's Journal

## 2024-05-22 - [HeroCarousel Item Memoization]
**Learning:** `HeroCarousel` uses `ScrollView` which renders all items. Memoizing `HeroCarouselItem` significantly reduces re-renders when the parent re-renders, as mostly only the layout changes.
**Action:** Ensure list items in non-virtualized lists are memoized if they are complex.

## 2024-05-22 - [Row Component Virtualization]
**Learning:** The `Row` component was using `ScrollView` for horizontal lists. This is performant for small numbers of items but scales poorly.
**Action:** Investigated swapping to `FlatList`, but `Row` is often used for finite, small lists. Keeping `ScrollView` for now but monitoring.

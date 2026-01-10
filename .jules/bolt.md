## 2024-05-23 - HeroCarousel Optimization
**Learning:** `React.memo` is only effective if all props are referentially stable. In `HeroCarousel`, the `onPress` callback was being recreated on every render because it was an inline function that called `onItemPress`.
**Action:** When memoizing a list item component, always wrap the event handler passed to it in `useCallback` in the parent component.

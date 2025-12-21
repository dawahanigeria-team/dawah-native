## 2024-05-24 - React Native List Optimization

**Learning:** When using mapped lists inside a parent component that re-renders frequently (e.g., due to data fetching hooks), inline function definitions (like `onPress`) break `memo` on child components. This is a classic React performance pitfall, but especially painful in React Native with heavy components like cards with images.

**Action:** Always wrap list rendering logic in `useMemo` and event handlers in `useCallback` when they are passed to memoized children in a potentially re-rendering parent.

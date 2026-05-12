# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npx expo start` or `npm start`
- **Run on iOS simulator**: `npm run ios` 
- **Run on Android emulator**: `npm run android`
- **Run on web**: `npm run web`
- **Lint code**: `npm run lint`
- **Type checking**: `npx tsc --noEmit` (no dedicated script - consider adding to package.json)
- **Run expo with clear cache**: `npx expo start --clear`

## Project Architecture

React Native Expo app using file-based routing with the following structure:

### Routing
- **Expo Router** with file-based routing
- Main Stack: `app/_layout.tsx` (wraps everything with ErrorBoundary and MiniPlayer)
- Tab Navigator: `app/(tabs)/_layout.tsx` (4 tabs with iOS-style haptic feedback)
- Dynamic routes: `app/section/[type].tsx` for parameterized screens

### State Management
- **simpler-state** for global state management
- Key stores in `src/stores/`:
  - `playerStore.ts`: Audio player state, queue management, playback controls
  - `themeStore.ts`: Theme preferences
- Import from `src/stores/index.ts`

### Component Organization (Atomic Design)
```
src/components/
├── atoms/       # Basic UI elements (Button, Text, Icon, ErrorBoundary)
├── molecules/   # Composed components (SearchBar, LectureCard)
├── organisms/   # Complex components (MiniPlayer, HeroCarousel, LectureList)
└── templates/   # Page layouts
```

### Design System
- **iOS-First Design**: Following Apple HIG with semantic colors
- **Design Tokens**: `src/theme/designTokens.ts` 
  - iOS Dynamic Type scale (largeTitle, title1-3, body, etc.)
  - iOS semantic color system with dark mode support
  - Minimum 44pt hit targets for accessibility
- **Styling**: TailwindCSS via `twrnc` + design tokens
- **Haptics**: iOS haptic feedback on tab navigation

### API Integration
- **Base URL**: `https://api.dawahnigeria.com`
- **API Service**: `src/services/api.ts`
- **Authentication**: Header `x-project: 206cf92c-8a46-45ef-bf3f-a6ef92fc6f25`
- **Audio Player Service**: `src/services/audioPlayer.ts` with Expo AV integration

### Audio Player Features
- Queue management with repeat modes (off/one/all)
- Playback speed control
- Sleep timer
- Background audio support
- Lecture and Episode playback support

### TypeScript Configuration
- **Strict mode enabled**
- **Path alias**: `@/*` → `src/*`
- **Base URL**: Project root

### Key Dependencies
- **expo-router**: File-based routing
- **expo-audio**: Audio playback
- **expo-haptics**: iOS haptic feedback
- **react-native-reanimated**: Animations (configured in babel.config.js)
- **simpler-state**: State management
- **twrnc**: TailwindCSS for React Native

### Testing & Quality
- Run lint before committing: `npm run lint`
- Type check: `npx tsc --noEmit`
- Consider adding pre-commit hooks for automated checks

### API Response Patterns
- Lectures use `nid` as ID field (not `id`)
- Title field is capitalized (`Title` not `title`)
- Duration format: "HH:MM:SS" string
- Media URLs from `https://media.dawahnigeria.com`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npx expo start` or `npm start`
- **Run on iOS simulator**: `npm run ios` 
- **Run on Android emulator**: `npm run android`
- **Run on web**: `npm run web`
- **Lint code**: `npm run lint`
- **Type checking**: Use `npx tsc --noEmit` (no dedicated script in package.json)

## Project Architecture

This is a React Native Expo app using file-based routing with the following key architectural decisions:

### Routing Structure
- Uses Expo Router with file-based routing
- Main layout: `app/_layout.tsx` (Stack navigator with hidden headers)
- Tab navigation: `app/(tabs)/_layout.tsx` with 4 tabs (Home, Search, Library, Profile)
- Individual screens: `app/(tabs)/[screen].tsx` and `app/index.tsx`

### Source Code Organization (`src/`)
```
src/
├── components/          # Atomic design system
│   ├── atoms/          # Basic UI elements (Button, Text, Icon, etc.)
│   ├── molecules/      # Composed components (Card, SearchBar, etc.)
│   ├── organisms/      # Complex components (ActionGrid, MiniPlayer, etc.)
│   └── templates/      # Page-level layouts
├── stores/             # State management (using simpler-state)
├── theme/              # Design system and tokens
├── types/              # TypeScript definitions
├── utils/              # Helper functions
├── screens/            # Screen components
├── data/               # Static data files
└── mock/               # Mock data for development
```

### State Management
- Primary: `simpler-state` library for global state
- Store files: `playerStore.ts`, `themeStore.ts`
- Import from `src/stores/index.ts`

### Design System
- **Design Tokens**: Comprehensive system in `src/theme/designTokens.ts`
- **iOS-First**: Follows Apple HIG with semantic color system supporting dark mode
- **Styling**: Uses both TailwindCSS (via twrnc) and design tokens
- **Typography**: iOS Dynamic Type scale (largeTitle, title1-3, body, etc.)
- **Colors**: iOS semantic color system with brand colors

### Key Libraries
- **Expo Router**: File-based routing
- **Expo Vector Icons**: Ionicons for tab navigation
- **React Native Reanimated**: Animations (configured in babel.config.js)
- **twrnc**: TailwindCSS for React Native
- **simpler-state**: Lightweight state management
- **Expo Haptics**: iOS haptic feedback

### TypeScript Configuration
- **Strict mode enabled**
- **Path aliases**: `@/*` maps to `src/*`
- **Base URL**: Project root

### App Features
This appears to be a Dawah (Islamic education) app with:
- Audio content (lecturers, series, episodes)
- Library with Quran, Tafsir, and Islamic content
- Search functionality
- Audio player with state management

### Development Notes
- Uses iOS-style tab navigation with haptic feedback
- Dark mode first design approach
- Component library follows atomic design principles
- All major UI components are in `src/components/` with proper exports
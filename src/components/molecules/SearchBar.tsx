import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, ViewStyle } from 'react-native';
import { designTokens, BorderRadius } from '../../theme/designTokens';
import { Touchable, Icon } from '../atoms';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (query: string) => void;
  onMicPress?: () => void;
  onClear?: () => void;
  debounceMs?: number;
  borderRadius?: BorderRadius;
  showMic?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = memo(({
  placeholder = "Search Qur'an, Tafsir, Lectures",
  value,
  onChangeText,
  onSearch,
  onMicPress,
  onClear,
  debounceMs = 250,
  borderRadius = 'full',
  showMic = true,
  showClear = true,
  disabled = false,
  autoFocus = false,
  style,
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [debouncedValue, setDebouncedValue] = useState(value || '');

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  // Debounce search input
  const debounceSearch = useCallback(
    (text: string) => {
      if (!isControlled) {
        setInternalValue(text);
      }
      onChangeText?.(text);

      const timeoutId = setTimeout(() => {
        setDebouncedValue(text);
        onSearch?.(text);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    },
    [onSearch, onChangeText, debounceMs, isControlled]
  );

  const handleClear = () => {
    const newValue = '';
    if (!isControlled) {
      setInternalValue(newValue);
    }
    setDebouncedValue(newValue);
    onChangeText?.(newValue);
    onSearch?.(newValue);
    onClear?.(newValue);
  };

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.system.fill.tertiary,
    borderRadius: designTokens.borderRadius.lg, // iOS uses slightly less rounded corners
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    marginHorizontal: 0,
    minHeight: 36, // iOS standard search bar height
    borderWidth: 0,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const inputStyle = {
    flex: 1,
    fontSize: designTokens.typography.fontSize.body,
    fontWeight: designTokens.typography.fontWeight.regular,
    fontFamily: designTokens.typography.fontFamily.system,
    color: designTokens.colors.system.label.primary,
    marginLeft: designTokens.spacing.sm,
    marginRight: designTokens.spacing.sm,
  };

  const showClearButton = showClear && currentValue.length > 0;

  return (
    <View style={containerStyle}>
      <Icon 
        name="search" 
        size="md" 
        color="muted"
        accessibilityLabel="Search icon"
      />
      
      <TextInput
        style={inputStyle}
        placeholder={placeholder}
        placeholderTextColor={designTokens.colors.system.label.tertiary}
        value={currentValue}
        onChangeText={debounceSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={!disabled}
        accessibilityLabel="Search input"
        accessibilityHint="Enter text to search for content"
        accessibilityRole="searchbox"
      />

      {showClearButton && (
        <Touchable
          onPress={handleClear}
          style={{
            marginLeft: designTokens.spacing.sm,
            height: 24,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Clear search"
          accessibilityHint="Tap to clear the search input"
          accessibilityRole="button"
        >
          <Icon 
            name="close-circle" 
            size="md" 
            color="muted"
          />
        </Touchable>
      )}

      {showMic && onMicPress && !showClearButton && (
        <Touchable
          onPress={onMicPress}
          style={{
            marginLeft: designTokens.spacing.sm,
            height: 24,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Voice search"
          accessibilityHint="Tap to start voice search"
          accessibilityRole="button"
        >
          <Icon 
            name="mic-outline" 
            size="md" 
            color="muted"
          />
        </Touchable>
      )}
    </View>
  );
});

SearchBar.displayName = 'SearchBar';
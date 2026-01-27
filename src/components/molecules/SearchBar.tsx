import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { TextInput, View, ViewStyle } from "react-native";
import { BorderRadius, designTokens } from "../../theme/designTokens";
import { Icon, Touchable } from "../atoms";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (query: string) => void;
  onSubmit?: (query: string) => void;
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

export const SearchBar: React.FC<SearchBarProps> = memo(
  ({
    placeholder = "Search content",
    value,
    onChangeText,
    onSearch,
    onSubmit,
    onMicPress,
    onClear,
    debounceMs = 250,
    borderRadius = "full",
    showMic = true,
    showClear = true,
    disabled = false,
    autoFocus = false,
    style,
  }) => {
    const [internalValue, setInternalValue] = useState(value || "");
    const inputRef = useRef<TextInput>(null);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    // Keep internal state in sync if parent controls the value or if we switch modes.
    // Also force-clear the native input when the value becomes empty (helps on iOS when
    // navigating back/forth and the TextInput retains its previous native text).
    useEffect(() => {
      if (isControlled) {
        setInternalValue(value ?? "");
        if ((value ?? "") === "") {
          inputRef.current?.clear();
        }
      }
    }, [isControlled, value]);

    // Handle text change without auto-triggering search
    const handleTextChange = useCallback(
      (text: string) => {
        if (!isControlled) {
          setInternalValue(text);
        }
        onChangeText?.(text);
        // DO NOT auto-trigger onSearch here - only on Enter press
      },
      [onChangeText, isControlled]
    );

    const handleClear = () => {
      const newValue = "";
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChangeText?.(newValue);
      // Don't auto-trigger search when clearing
      onClear?.();
    };

    const containerStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: designTokens.colors.system.fill.tertiary,
      borderRadius: designTokens.borderRadius.lg,
      paddingHorizontal: designTokens.spacing.md,
      paddingVertical: designTokens.spacing.sm,
      marginHorizontal: 0,
      minHeight: designTokens.hitTargets.minimum, // Ensure 44pt minimum height
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
          ref={inputRef}
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor={designTokens.colors.system.label.tertiary}
          value={currentValue}
          onChangeText={handleTextChange}
          onSubmitEditing={() => {
            // Call both onSubmit and onSearch when Enter is pressed
            onSubmit?.(currentValue);
            onSearch?.(currentValue);
          }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={!disabled}
          accessibilityLabel="Search input"
          accessibilityHint="Enter text to search for content"
          accessibilityRole="search"
        />

        {showClearButton && (
          <Touchable
            onPress={handleClear}
            style={{
              marginLeft: designTokens.spacing.sm,
              height: designTokens.hitTargets.minimum,
              width: designTokens.hitTargets.minimum,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Clear search"
            accessibilityHint="Tap to clear the search input"
            accessibilityRole="button"
          >
            <Icon name="close-circle" size="md" color="muted" />
          </Touchable>
        )}

        {showMic && onMicPress && !showClearButton && (
          <Touchable
            onPress={onMicPress}
            style={{
              marginLeft: designTokens.spacing.sm,
              height: designTokens.hitTargets.minimum,
              width: designTokens.hitTargets.minimum,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Voice search"
            accessibilityHint="Tap to start voice search"
            accessibilityRole="button"
          >
            <Icon name="mic-outline" size="md" color="muted" />
          </Touchable>
        )}
      </View>
    );
  }
);

SearchBar.displayName = "SearchBar";

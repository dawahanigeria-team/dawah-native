import React, { memo, useState } from "react";
import { FlatList, Modal, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { designTokens } from "../../theme/designTokens";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { Touchable } from "./Touchable";
import { boxShadow } from "../../utils/shadow";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = memo(
  ({
    options,
    selectedValue,
    onSelect,
    placeholder = "Select...",
    style,
    disabled = false,
  }) => {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(
      (option) => option.value === selectedValue
    );

    const handleSelect = (value: string) => {
      onSelect(value);
      setIsOpen(false);
    };

    const triggerStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.system.background.secondary,
      paddingHorizontal: designTokens.spacing.md,
      paddingVertical: designTokens.spacing.sm,
      borderRadius: designTokens.borderRadius.lg,
      minHeight: designTokens.hitTargets.comfortable,
      opacity: disabled ? 0.6 : 1,
      ...style,
    };

    const modalStyle: ViewStyle = {
      flex: 1,
      backgroundColor: colors.overlay.darkMedium,
      justifyContent: "center",
      paddingHorizontal: designTokens.spacing.lg,
    };

    const contentStyle: ViewStyle = {
      backgroundColor: colors.system.background.secondary,
      borderRadius: designTokens.borderRadius.xl,
      maxHeight: 300,
      padding: designTokens.spacing.md,
      // elevation 8 folded in: boxShadow renders on both platforms.
      boxShadow: boxShadow(colors.fixed.black, 0.15, 12, 4, 0),
    };

    const optionStyle: ViewStyle = {
      paddingVertical: designTokens.spacing.md,
      paddingHorizontal: designTokens.spacing.lg,
      borderRadius: designTokens.borderRadius.md,
      marginVertical: designTokens.spacing.xs,
    };

    const selectedOptionStyle: ViewStyle = {
      backgroundColor: colors.system.fill.tertiary,
    };

    return (
      <>
        <Touchable
          style={triggerStyle}
          onPress={() => !disabled && setIsOpen(true)}
          accessibilityLabel={`Dropdown: ${selectedOption?.label || placeholder}`}
          accessibilityRole="button"
          accessibilityHint="Tap to open dropdown options"
        >
          <Text
            variant="body"
            color={selectedOption ? "label" : "tertiaryLabel"}
            numberOfLines={1}
          >
            {selectedOption?.label || placeholder}
          </Text>
          <Icon
            name="chevron-down"
            size="sm"
            color="muted"
            style={{
              transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
              marginLeft: designTokens.spacing.sm,
            }}
          />
        </Touchable>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={modalStyle}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <TouchableOpacity
              style={contentStyle}
              activeOpacity={1}
              onPress={() => {}}
            >
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Touchable
                    style={
                      item.value === selectedValue
                        ? { ...optionStyle, ...selectedOptionStyle }
                        : optionStyle
                    }
                    onPress={() => handleSelect(item.value)}
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.value === selectedValue }}
                  >
                    <Text
                      variant="body"
                      color={item.value === selectedValue ? "brand" : "label"}
                      weight={item.value === selectedValue ? "semibold" : "regular"}
                    >
                      {item.label}
                    </Text>
                  </Touchable>
                )}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }
);

Dropdown.displayName = "Dropdown";

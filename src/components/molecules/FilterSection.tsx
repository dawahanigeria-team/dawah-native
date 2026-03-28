import React, { memo, useState } from 'react';
import { View, ScrollView, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/designTokens';
import { Chip } from '../atoms/Chip';
import { Text } from '../atoms/Text';
import { SearchBar } from './SearchBar';

interface FilterSectionProps {
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
  searchable?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = memo(({
  title,
  options,
  selectedValue,
  onSelect,
  style,
  searchable = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(option => 
        option.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const containerStyle: ViewStyle = {
    marginBottom: designTokens.spacing.lg,
    ...style,
  };

  const headerStyle: ViewStyle = {
    marginBottom: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.lg,
  };

  const chipsContainerStyle = {
    paddingHorizontal: designTokens.spacing.lg,
  };

  const chipSpacing = {
    marginRight: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  };

  return (
    <View style={containerStyle}>
      <View style={headerStyle}>
        <Text
          variant="footnote"
          color="secondaryLabel"
          weight="semibold"
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {title}
        </Text>
      </View>
      
      {searchable && (
        <View style={{ paddingHorizontal: designTokens.spacing.lg, marginBottom: designTokens.spacing.sm }}>
          <SearchBar
            placeholder={`Search ${title.toLowerCase()}...`}
            onSearch={setSearchQuery}
            showMic={false}
          />
        </View>
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chipsContainerStyle}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {filteredOptions.map((option) => (
            <View key={option} style={chipSpacing}>
              <Chip
                label={option}
                variant="primary"
                size="medium"
                selected={selectedValue === option}
                onPress={() => onSelect(option)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

FilterSection.displayName = 'FilterSection';

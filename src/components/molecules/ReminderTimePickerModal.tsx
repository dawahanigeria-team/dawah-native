import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'

import { useTheme } from '../../hooks/useTheme'
import { Text } from '../atoms'

interface ReminderTimePickerModalProps {
  visible: boolean
  value: string
  title: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, '0'))

const ReminderTimePickerModal: React.FC<ReminderTimePickerModalProps> = ({
  visible,
  value,
  title,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme()
  const initialParts = useMemo(() => value.split(':'), [value])
  const [hour, setHour] = useState(initialParts[0] ?? '07')
  const [minute, setMinute] = useState(initialParts[1] ?? '00')

  useEffect(() => {
    if (!visible) return
    const [nextHour = '07', nextMinute = '00'] = value.split(':')
    setHour(nextHour)
    setMinute(nextMinute)
  }, [value, visible])

  const renderOptions = (
    options: string[],
    selected: string,
    onSelect: (next: string) => void,
    label: string,
  ) => (
    <View
      style={styles.selector}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: selected }}
    >
      <ScrollView
        style={styles.optionList}
        contentContainerStyle={styles.optionListContent}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const isSelected = option === selected
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.option,
                isSelected && { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text
                weight={isSelected ? 'bold' : 'regular'}
                style={{
                  color: isSelected
                    ? colors.fixed.white
                    : colors.system.label.primary,
                }}
              >
                {option}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.system.background.secondary },
          ]}
        >
          <Text variant="headline" weight="bold" style={styles.title}>
            {title}
          </Text>

          <View style={styles.pickerRow}>
            {renderOptions(HOURS, hour, setHour, 'Reminder hour')}
            <Text variant="title2" weight="bold">:</Text>
            {renderOptions(MINUTES, minute, setMinute, 'Reminder minute')}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel reminder time"
              onPress={onCancel}
              style={styles.action}
            >
              <Text weight="semibold">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm reminder time"
              onPress={() => onConfirm(`${hour}:${minute}`)}
              style={[
                styles.action,
                styles.confirmAction,
                { backgroundColor: colors.brand.primary },
              ]}
            >
              <Text weight="semibold" style={{ color: colors.fixed.white }}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  selector: {
    width: 88,
  },
  optionList: {
    height: 220,
  },
  optionListContent: {
    paddingVertical: 84,
  },
  option: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  action: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmAction: {
    minWidth: 96,
    alignItems: 'center',
  },
})

export default ReminderTimePickerModal

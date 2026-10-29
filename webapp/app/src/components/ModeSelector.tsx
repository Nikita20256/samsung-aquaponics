import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

const modes = ['Выкл', 'Авто', 'Вкл'] as const;
export type DeviceMode = typeof modes[number];

export default function ModeSelector({ label, value, onChange, disabled = false }: {
  label: string;
  value: DeviceMode | null;
  disabled?: boolean;
  onChange: (mode: DeviceMode) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {modes.map(mode => (
          <Pressable key={mode} accessibilityRole="radio"
            accessibilityLabel={`${label}: ${mode}`} accessibilityState={{ checked: value === mode, disabled }}
            disabled={disabled}
            onPress={() => onChange(mode)}
            style={({ pressed }) => [styles.button, value === mode && styles.selected, disabled && { opacity: 0.45 }, pressed && styles.pressed]}>
            <Text style={[styles.caption, value === mode && styles.selectedCaption]}>{mode}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  label: { color: '#A6BD99', fontSize: 11, flexShrink: 1 },
  modes: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: '#2A4027', backgroundColor: '#0C1A0E', padding: 2 },
  button: { minWidth: 45, minHeight: 32, paddingHorizontal: 6, borderRadius: 7, borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: '#35572A', borderColor: '#476F33' },
  caption: { color: colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  selectedCaption: { color: '#E5F5D9', fontWeight: '600' },
  pressed: { opacity: 0.7 },
});

import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../theme';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={formStyles.field}><Text style={formStyles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#7E9477" autoCapitalize="none" autoCorrect={false}
      {...props} style={[formStyles.input, props.style]} /></View>;
}
export function Button({ title, onPress, disabled = false, busy = false, secondary = false, style, textStyle }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean;
  style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [formStyles.button, secondary && formStyles.secondary, style, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}>
    {busy ? <ActivityIndicator color={colors.text} /> : <Text style={[formStyles.buttonText, textStyle]}>{title}</Text>}
  </Pressable>;
}
export function FormScroll({ children }: { children: ReactNode }) {
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={formStyles.container}>{children}</ScrollView>
  </KeyboardAvoidingView>;
}
export function Feedback({ error, message }: { error?: string | null; message?: string | null }) {
  return <>{error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={formStyles.error}>{error}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={formStyles.message}>{message}</Text> : null}</>;
}
export const formStyles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  heading: { color: colors.text, fontSize: 25, fontWeight: '600', marginTop: 12 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  section: { borderWidth: 1, borderColor: '#375432', borderRadius: 18, padding: 16, gap: 12, backgroundColor: 'rgba(16, 32, 17, .85)' },
  field: { gap: 7 }, label: { color: '#C3D7B8', fontSize: 13 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#45643C', borderRadius: 12, padding: 12, color: colors.text, backgroundColor: '#122415', fontSize: 16 },
  button: { minHeight: 46, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#35572A' },
  secondary: { backgroundColor: '#20391F', borderWidth: 1, borderColor: '#45643C' },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  error: { color: '#FFD1BE', fontSize: 14, lineHeight: 21 },
  message: { color: '#C4E5AD', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});

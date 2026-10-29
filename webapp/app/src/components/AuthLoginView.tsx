import { useId, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useWindowDimensions, type TextInputInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';

import loginIcon from '../../assets/auth/login.svg';
import passwordIcon from '../../assets/auth/password.svg';
import visibilityIcon from '../../assets/auth/visibility.svg';
import { Button, Feedback } from './FormControls';

type Props = {
  login: string; password: string; busy: boolean;
  server: string; onServerChange: (value: string) => void;
  error: string | null; message: string | null;
  onLoginChange: (value: string) => void; onPasswordChange: (value: string) => void;
  onSubmit: () => void; onForgotPassword: () => void; onRegister: () => void;
};

function AuthBackdrop({ width, height, left = 0, top = 0, underGlass = false }: {
  width: number; height: number; left?: number; top?: number; underGlass?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <View style={{ position: 'absolute', width, height, left, top }} pointerEvents="none"
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Image source={require('../../assets/loading/rainforest-background.png')} blurRadius={underGlass ? 6 : 2.5}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" accessible={false} />
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 384 832" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`${id}glow`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={10} rx={10} ry={10}
          gradientTransform="matrix(11.833 25.377 -19.486 9.0863 100 357)">
          <Stop offset={0} stopColor="#688B4F" stopOpacity={0.23} />
          <Stop offset={0.55} stopColor="#35572A" stopOpacity={0.12} />
          <Stop offset={1} stopColor="#35572A" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}shade`} x1={0} y1={0} x2={0} y2={1}>
          <Stop offset={0} stopColor="#0D1A0D" stopOpacity={0.18} />
          <Stop offset={0.48} stopColor="#0D1A0D" stopOpacity={0.26} />
          <Stop offset={1} stopColor="#0D1A0D" stopOpacity={0.22} />
        </LinearGradient>
      </Defs>
      <Rect width={384} height={832} fill={`url(#${id}glow)`} />
      {!underGlass && <Rect width={384} height={832} fill={`url(#${id}shade)`} />}
    </Svg>
  </View>;
}

/** Login design from Figma 2032:481; session and API state stay in AuthScreen. */
export default function AuthLoginView(props: Props) {
  const window = useWindowDimensions();
  // Android's window dimensions can exclude system bars even when this view
  // extends beneath them. Both background layers must use the actual root size.
  const [{ width, height }, setCanvas] = useState({ width: window.width, height: window.height });
  const insets = useSafeAreaInsets();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const passwordInput = useRef<TextInputInstance>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [focused, setFocused] = useState<'login' | 'password' | null>(null);
  const [card, setCard] = useState({ x: 24, y: 268 - insets.top });
  const [scrollY, setScrollY] = useState(0);
  const pageOffset = Math.max(0, (width - 432) / 2);

  return (
    <View style={styles.screen} onLayout={({ nativeEvent: { layout } }) => {
      setCanvas(previous => previous.width === layout.width && previous.height === layout.height
        ? previous : { width: layout.width, height: layout.height });
    }}>
      <AuthBackdrop width={width} height={height} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => setScrollY(nativeEvent.contentOffset.y)} scrollEventThrottle={16}
            contentContainerStyle={[styles.page, { paddingTop: Math.max(16, 68 - insets.top) }]}>
            <View style={styles.brand}>
              <Text style={styles.brandName}>FISH &amp; GREENS</Text>
              <Text style={styles.tagline}>АКВАПОНИКА</Text>
            </View>
            <View style={styles.greeting}>
              <Text style={styles.title} accessibilityRole="header">С возвращением</Text>
              <Text style={styles.description}>{'Войдите, чтобы быть ближе\nк своей аквапонике.'}</Text>
            </View>
            <View style={styles.card} onLayout={({ nativeEvent: { layout } }) => setCard({ x: layout.x, y: layout.y })}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
                accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <AuthBackdrop width={width} height={height} left={-pageOffset - card.x}
                  top={-insets.top - card.y + scrollY} underGlass />
                <View style={[StyleSheet.absoluteFill, styles.cardTint]} />
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 336 382" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id={`${id}glass`} x1={0} y1={0} x2={1} y2={1}>
                      <Stop offset={0} stopColor="#D1EBC3" stopOpacity={0.12} />
                      <Stop offset={0.37443} stopColor="#668861" stopOpacity={0.08} />
                      <Stop offset={0.98534} stopColor="#142B1B" stopOpacity={0.5} />
                    </LinearGradient>
                    <LinearGradient id={`${id}edge`} x1={0} y1={0} x2={1} y2={1}>
                      <Stop offset={0} stopColor="#D3EED5" stopOpacity={0.5} />
                      <Stop offset={0.5} stopColor="#D3EED5" stopOpacity={0.18} />
                      <Stop offset={1} stopColor="#D3EED5" stopOpacity={0.2} />
                    </LinearGradient>
                  </Defs>
                  <Rect width={336} height={382} fill={`url(#${id}glass)`} />
                  <Rect x={0.5} y={0.5} width={335} height={381} rx={23.5} fill="none"
                    stroke={`url(#${id}edge)`} strokeWidth={1} />
                </Svg>
              </View>
              <View style={styles.fields}>
                <View style={styles.field}>
                  <Text style={styles.label} nativeID="auth-login-label">Логин</Text>
                  <View style={[styles.inputFrame, focused === 'login' && styles.focused]}>
                    <View style={styles.fieldIcon} pointerEvents="none" accessible={false}><SvgXml xml={loginIcon} /></View>
                    <TextInput value={props.login} onChangeText={props.onLoginChange} editable={!props.busy}
                      accessibilityLabel="Логин" placeholder="Ваш логин" placeholderTextColor="#859D87"
                      autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username"
                      returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()}
                      onFocus={() => setFocused('login')} onBlur={() => setFocused(null)} style={styles.input} />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label} nativeID="auth-password-label">Пароль</Text>
                  <View style={[styles.inputFrame, focused === 'password' && styles.focused]}>
                    <View style={styles.fieldIcon} pointerEvents="none" accessible={false}><SvgXml xml={passwordIcon} /></View>
                    <TextInput ref={passwordInput} value={props.password} onChangeText={props.onPasswordChange} editable={!props.busy}
                      accessibilityLabel="Пароль" placeholder="Введите пароль" placeholderTextColor="#859D87"
                      autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password"
                      secureTextEntry={!showPassword} returnKeyType="go" onSubmitEditing={props.onSubmit}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} style={styles.input} />
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      accessibilityState={{ checked: showPassword }} onPress={() => setShowPassword(value => !value)}
                      hitSlop={12} style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
                      <SvgXml xml={visibilityIcon} />
                    </Pressable>
                  </View>
                </View>
              </View>
              <View style={styles.forgotRow}>
                <Pressable accessibilityRole="button" disabled={props.busy} onPress={props.onForgotPassword}
                  hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.forgotText}>Забыли пароль?</Text>
                </Pressable>
              </View>
              {(props.error || props.message) && <View style={styles.feedback}><Feedback error={props.error} message={props.message} /></View>}
              <Button title="Войти" onPress={props.onSubmit} busy={props.busy} style={styles.submit} textStyle={styles.submitText} />
              <View style={styles.divider} />
              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>Нет аккаунта?</Text>
                <Pressable accessibilityRole="button" disabled={props.busy} onPress={props.onRegister}
                  hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.registerLink}>Создать аккаунт</Text>
                </Pressable>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showConnection }}
              disabled={props.busy} onPress={() => setShowConnection(value => !value)}
              style={({ pressed }) => [styles.connectionToggle, pressed && styles.pressed]}>
              <Text style={styles.forgotText}>Настройки подключения</Text>
            </Pressable>
            {showConnection && <View style={styles.field}>
              <Text style={styles.label}>Адрес сервера</Text>
              <TextInput accessibilityLabel="Адрес сервера" value={props.server} onChangeText={props.onServerChange}
                editable={!props.busy} keyboardType="url" autoCapitalize="none" autoCorrect={false}
                placeholder="https://example.com/api" placeholderTextColor="#859D87"
                style={[styles.inputFrame, styles.serverInput]} />
            </View>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1A0D' },
  safeArea: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: 432, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  brand: { height: 48, marginLeft: 8, gap: 5 },
  brandName: { color: '#E6F3DF', fontSize: 21, lineHeight: 28, fontWeight: '700', letterSpacing: 0.65, includeFontPadding: false },
  tagline: { color: '#88A58C', fontSize: 11, lineHeight: 15, letterSpacing: 1.5, includeFontPadding: false },
  greeting: { marginLeft: 8, marginTop: 57, gap: 5 },
  title: { color: '#E8F3E2', fontSize: 27, lineHeight: 36, fontWeight: '600', letterSpacing: -0.6, includeFontPadding: false },
  description: { color: '#9AAF9B', fontSize: 12, lineHeight: 18, includeFontPadding: false },
  card: { marginTop: 18, minHeight: 382, borderRadius: 24, overflow: 'hidden', padding: 20, paddingBottom: 24 },
  cardTint: { backgroundColor: 'rgba(20,36,20,0.22)' },
  fields: { gap: 20 },
  field: { gap: 8 },
  label: { color: '#CEDDC9', fontSize: 12, lineHeight: 16, includeFontPadding: false },
  inputFrame: { flexDirection: 'row', height: 52, alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 15,
    borderRadius: 13, borderWidth: 1, borderColor: 'rgba(163,196,164,0.3)', backgroundColor: 'rgba(6,28,20,0.44)' },
  focused: { borderColor: '#A3C4A4' },
  fieldIcon: { width: 18, height: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: '100%', padding: 0, color: '#E8F5E2', fontSize: 14, lineHeight: 20, includeFontPadding: false },
  visibilityButton: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  forgotRow: { marginTop: 16, height: 20, alignItems: 'flex-end', justifyContent: 'center' },
  forgotText: { color: '#B1CDA4', fontSize: 12, lineHeight: 18, includeFontPadding: false },
  feedback: { marginTop: 12 },
  submit: { marginTop: 16, height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(213,233,184,0.22)', backgroundColor: '#35572A' },
  submitText: { color: '#E8F5E2', fontSize: 15, lineHeight: 20, fontWeight: '600', includeFontPadding: false },
  divider: { height: 1, marginTop: 23.5, marginHorizontal: 2, backgroundColor: 'rgba(176,201,174,0.12)' },
  registerRow: { height: 20, marginTop: 17.5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  registerPrompt: { color: '#91A992', fontSize: 12, lineHeight: 18, includeFontPadding: false },
  registerLink: { color: '#C1DEAE', fontSize: 12, lineHeight: 18, fontWeight: '600', includeFontPadding: false },
  pressed: { opacity: 0.7 },
  connectionToggle: { alignSelf: 'center', padding: 16, marginTop: 8 },
  serverInput: { color: '#E8F5E2', fontSize: 14, paddingHorizontal: 14 },
});

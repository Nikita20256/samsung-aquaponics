import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiClient, errorMessage } from '../api/client';
import { createAquaponicsApi } from '../api/aquaponics';
import { Button, Feedback, Field, FormScroll, formStyles as s } from '../components/FormControls';
import HomeBackground from '../components/HomeBackground';
import { useSession } from '../context/SessionContext';
import AuthLoginView from '../components/AuthLoginView';

type Step = 'login' | 'register' | 'confirm' | 'forgot' | 'reset';
const titles: Record<Step, string> = { login: 'Вход', register: 'Регистрация', confirm: 'Подтверждение почты', forgot: 'Восстановление пароля', reset: 'Новый пароль' };
export default function AuthScreen() {
  const session = useSession();
  const [step, setStep] = useState<Step>('login');
  const [server, setServer] = useState(session.baseUrl);
  useEffect(() => { setServer(session.baseUrl); }, [session.baseUrl]);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const changeStep = (next: Step) => { setStep(next); setError(null); setMessage(null); setCode(''); setPassword(''); };
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      if (step === 'login' && (!login.trim() || !password)) throw new Error('Введите логин и пароль.');
      const api = createAquaponicsApi(new ApiClient(server));
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (step === 'login') await session.signIn(server, login, password);
      else if (step === 'register') {
        if (login.trim().length < 3 || password.length < 3) throw new Error('Логин и пароль должны содержать не менее 3 символов.');
        const result = await api.register(login.trim(), password, email.trim() || undefined, timezone);
        setPassword('');
        if (result.emailVerification.required) {
          setStep('confirm'); setResendAt(Date.now() + (result.emailVerification.resendAfter ?? 60) * 1000);
          setMessage(result.emailVerification.sent ? 'Введите код из письма.' : 'Аккаунт создан. Письмо не отправлено; попробуйте отправить код повторно.');
        } else { setStep('login'); setMessage('Аккаунт создан. Войдите с новым паролем.'); }
      } else if (step === 'confirm') {
        await api.confirmEmail(email.trim(), code.trim()); changeStep('login'); setMessage('Почта подтверждена. Теперь можно войти.');
      } else if (step === 'forgot') {
        const result = await api.forgotPassword(login.trim()); setStep('reset'); setResendAt(Date.now() + (result.resendAfter ?? 60) * 1000);
        setMessage('Если к аккаунту привязана подтверждённая почта, на неё отправлен код.');
      } else {
        await api.resetPassword(login.trim(), code.trim(), password); changeStep('login'); setMessage('Пароль изменён. Войдите с новым паролем.');
      }
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (busy) return;
    if (Date.now() < resendAt) { setError(`Повторите через ${Math.ceil((resendAt - Date.now()) / 1000)} сек.`); return; }
    setBusy(true); setError(null);
    try {
      const api = createAquaponicsApi(new ApiClient(server));
      const result = step === 'confirm' ? await api.resendCode(email.trim()) : await api.forgotPassword(login.trim());
      setResendAt(Date.now() + (result.resendAfter ?? 60) * 1000); setMessage('Запрос на повторную отправку кода выполнен.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  if (step === 'login') return <AuthLoginView login={login} password={password} busy={busy}
    server={server} onServerChange={setServer}
    error={error} message={message || session.notice} onLoginChange={setLogin} onPasswordChange={setPassword}
    onSubmit={() => void submit()} onForgotPassword={() => changeStep('forgot')} onRegister={() => changeStep('register')} />;

  return <HomeBackground><SafeAreaView style={{ flex: 1 }}><FormScroll>
    <Text style={s.heading}>FISH &amp; GREENS</Text><Text style={s.text}>Подключитесь к своей аквапонике</Text>
    <View style={s.section}>
      <Text style={s.heading}>{titles[step]}</Text>
      <Field label="Адрес сервера" value={server} onChangeText={setServer} keyboardType="url" editable={!busy} />
      <Text style={s.text}>На телефоне укажите IP компьютера в общей Wi-Fi сети или HTTPS-адрес сервера. Туннель Expo передаёт только само приложение.</Text>
      {step !== 'confirm' && <Field label={step === 'forgot' || step === 'reset' ? 'Логин или почта' : 'Логин'} value={login} onChangeText={setLogin} editable={!busy} autoComplete="username" />}
      {(step === 'register' || step === 'reset') && <Field label={step === 'reset' ? 'Новый пароль' : 'Пароль'} value={password} onChangeText={setPassword} secureTextEntry editable={!busy} autoComplete="new-password" />}
      {(step === 'register' || step === 'confirm') && <Field label={step === 'register' ? 'Почта (необязательно)' : 'Почта'} value={email} onChangeText={setEmail} keyboardType="email-address" editable={!busy && step === 'register'} autoComplete="email" />}
      {(step === 'confirm' || step === 'reset') && <Field label="Код из письма" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} editable={!busy} autoComplete="one-time-code" />}
      <Feedback error={error} message={message || session.notice} />
      <Button title={step === 'register' ? 'Создать аккаунт' : step === 'forgot' ? 'Получить код' : 'Подтвердить'} onPress={() => void submit()} busy={busy} />
      <>
        {(step === 'confirm' || step === 'reset') && <Button secondary title="Отправить код повторно" onPress={() => void resend()} disabled={busy} />}
        <Button secondary title="Вернуться ко входу" onPress={() => changeStep('login')} disabled={busy} />
      </>
    </View>
  </FormScroll></SafeAreaView></HomeBackground>;
}

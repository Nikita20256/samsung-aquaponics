import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';
import ellipseImage from '../assets/images/ellipse 9.png';
import registerBgImage from '../assets/images/register-bg.png';

const API_BASE_URL = 'http://localhost:3000/api';
//const API_BASE_URL = 'https://aquaponiks.ru/api';

function Register({ setToken }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/register', {
        login,
        password,
        email: email || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, {
        baseURL: API_BASE_URL,
      });

      const verification = response.data.emailVerification;

      // Если указан email — сначала подтверждаем его кодом
      if (verification?.required) {
        setStep('confirm');
      } else {
        setSuccess('Регистрация успешна! Перенаправление на страницу входа...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('/auth/confirm-email', { email, code }, {
        baseURL: API_BASE_URL,
      });
      setSuccess('Email подтверждён! Перенаправление на страницу входа...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка подтверждения');
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('/auth/resend-confirm-code', { email }, {
        baseURL: API_BASE_URL,
      });
      setSuccess(response.data.message || 'Код отправлен повторно. Проверьте почту.');
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось отправить код повторно');
    }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <img src={ellipseImage} alt="Ellipse" className="register-image" />
        <img src={registerBgImage} alt="Register Background" className="register-bg-image" />
      </div>
      <div className="register-right">
        {step === 'form' ? (
          <form className="register-form" onSubmit={handleSubmit}>
            <label className="register-label">Логин*</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="register-input"
              required
              minLength={3}
            />
            <label className="register-label">Пароль*</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="register-input"
              required
              minLength={3}
            />
            <label className="register-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="register-input"
              placeholder="Email (необязательно)"
            />

            {error && <p className="register-error">{error}</p>}
            {success && <p className="register-success">{success}</p>}
            <button type="submit" className="register-button">Зарегистрироваться</button>
          </form>
        ) : (
          <form className="register-form" onSubmit={handleConfirm}>
            <p className="register-info">
              Мы отправили код подтверждения на <strong>{email}</strong>.
              Введите его ниже, чтобы завершить регистрацию.
            </p>
            <label className="register-label">Код подтверждения</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="register-input"
              placeholder="6-значный код"
              required
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />

            {error && <p className="register-error">{error}</p>}
            {success && <p className="register-success">{success}</p>}

            <button type="submit" className="register-button">Подтвердить</button>
            <button type="button" className="register-resend" onClick={handleResend}>
              Отправить код повторно
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;
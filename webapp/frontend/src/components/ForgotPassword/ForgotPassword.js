import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';
import ellipseImage from '../assets/images/ellipse 9.png';
import loginBgImage from '../assets/images/login-bg.png';

const API_BASE_URL = 'http://localhost:3000/api';

function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'done'
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('/auth/forgot-password', { identifier }, {
        baseURL: API_BASE_URL,
      });
      setSuccess(response.data.message || 'Код отправлен на почту');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при отправке кода');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 3) {
      setError('Пароль должен содержать не менее 3 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      await axios.post('/auth/reset-password', { identifier, code, newPassword }, {
        baseURL: API_BASE_URL,
      });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при смене пароля');
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-left">
        <img src={ellipseImage} alt="Ellipse" className="forgot-image" />
        <img src={loginBgImage} alt="Background" className="forgot-bg-image" />
      </div>
      <div className="forgot-right">
        {step === 'email' && (
          <form className="forgot-form" onSubmit={handleSendCode}>
            <p className="forgot-info">
              Укажите логин или email, привязанный к аккаунту. Мы отправим на почту код для восстановления пароля.
            </p>
            <label className="forgot-label">Логин или Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="forgot-input"
              required
              placeholder="example@mail.com или логин"
            />
            {error && <p className="forgot-error">{error}</p>}
            {success && <p className="forgot-success">{success}</p>}
            <button type="submit" className="forgot-button">Отправить код</button>
            <p className="forgot-link">
              Вспомнили пароль? <a href="/login">Войти</a>
            </p>
          </form>
        )}

        {step === 'reset' && (
          <form className="forgot-form" onSubmit={handleReset}>
            <p className="forgot-info">
              Код отправлен на почту аккаунта <strong>{identifier}</strong>. Введите его и новый пароль.
            </p>
            <label className="forgot-label">Код из письма</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="forgot-input"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="6-значный код"
            />
            <label className="forgot-label">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="forgot-input"
              required
              minLength={3}
            />
            <label className="forgot-label">Повторите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="forgot-input"
              required
              minLength={3}
            />
            {error && <p className="forgot-error">{error}</p>}
            <button type="submit" className="forgot-button">Сменить пароль</button>
            <p className="forgot-link">
              Вспомнили пароль? <a href="/login">Войти</a>
            </p>
          </form>
        )}

        {step === 'done' && (
          <div className="forgot-form">
            <p className="forgot-success">Пароль успешно изменён!</p>
            <button
              type="button"
              className="forgot-button"
              onClick={() => navigate('/login')}
            >
              Перейти ко входу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
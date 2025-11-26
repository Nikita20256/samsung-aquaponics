import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const API_BASE_URL = 'http://localhost:3000';

function Register({ setToken }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [device_secret, setDeviceSecret] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
        device_secret: device_secret || undefined,
      }, {
        baseURL: API_BASE_URL,
      });
      
      setSuccess('Регистрация успешна! Перенаправление на страницу входа...');
      
      // Через 1.5 секунды перенаправляем на страницу входа
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  return (
    <div className="register-page">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2 className="register-title">Регистрация</h2>
        <label className="register-label">Логин *</label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="register-input"
          required
          minLength={3}
        />
        <label className="register-label">Пароль *</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="register-input"
          required
          minLength={3}
        />
        <label className="register-label">Email (необязательно)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="register-input"
        />
        <label className="register-label">Код устройства *</label>
        <input
          type="text"
          value={device_secret}
          onChange={(e) => setDeviceSecret(e.target.value)}
          className="register-input"
          placeholder="Пароль устройства для связывания"
          required
        />
        {error && <p className="register-error">{error}</p>}
        {success && <p className="register-success">{success}</p>}
        <button type="submit" className="register-button">Зарегистрироваться</button>
        <p className="register-link">
          Уже есть аккаунт? <a href="/login">Войти</a>
        </p>
      </form>
    </div>
  );
}

export default Register;


import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import ellipseImage from '../assets/images/ellipse 9.png';
import loginBgImage from '../assets/images/login-bg.png';

const API_BASE_URL = 'http://localhost:3000/api';


function Login({ setToken }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/login', {
        login,
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, {
        baseURL: API_BASE_URL,
      });
      setToken(response.data.token);
      setError('');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={ellipseImage} alt="Ellipse" className="login-image" />
        <img src={loginBgImage} alt="Login Background" className="login-bg-image" />
      </div>
      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">Логин</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="login-input"
            required
          />
          <label className="login-label">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />
          <p className="login-link">
            Нет аккаунта? <a href="/register">Зарегистрироваться</a>
          </p>
          <p className="login-forgot">
            <a href="/forgot-password">Забыли пароль?</a>
          </p>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-button">Войти</button>
        </form>
      </div>
    </div>
  );
}

export default Login;

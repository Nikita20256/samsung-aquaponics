import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Подключаем CSS файл

const API_BASE_URL = 'http://localhost:3000/api';
//const API_BASE_URL = 'https://aquaponiks.ru/api';

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
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-button">Войти</button>
        <p className="login-link">
          Нет аккаунта? <a href="/register">Зарегистрироваться</a>
        </p>
      </form>
    </div>
  );
}

export default Login;

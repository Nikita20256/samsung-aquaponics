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
      <div className="register-left">
        <img src={ellipseImage} alt="Ellipse" className="register-image" />
        <img src={registerBgImage} alt="Register Background" className="register-bg-image" />
      </div>
      <div className="register-right">
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
      </div>
    </div>
  );
}

export default Register;

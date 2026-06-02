import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar({ token, setToken }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1200);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch('http://localhost:3000/api/admin/check', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [token]);

  // Отслеживаем изменение размера экрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1200);
      if (window.innerWidth > 1200) {
        setIsMenuOpen(false); // Закрываем меню при расширении экрана
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Блокируем прокрутку при открытом меню на мобильных
  useEffect(() => {
    if (isMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, isMobile]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <span className="navbar-logo" onClick={() => handleNavigation('/')}>
            Fish & Greens
          </span>
          
          {/* Десктопное меню */}
          {!isMobile && (
            <div className="navbar-links">
              <button onClick={() => handleNavigation('/')} className="nav-button">Главная</button>
              <button onClick={() => handleNavigation('/plants')} className="nav-button">Наши растения</button>
              {token && <button onClick={() => handleNavigation('/dashboard')} className="nav-button">Мое устройство</button>}
              {token && <button onClick={() => handleNavigation('/profile')} className="nav-button">Профиль</button>}
              {isAdmin && <button onClick={() => handleNavigation('/admin')} className="nav-button" style={{ color: '#f5d742' }}>👑 Админ</button>}
            </div>
          )}
        </div>

        {!isMobile && (
          token ? (
            <button onClick={handleLogout} className="nav-button">Выход</button>
          ) : (
            <button onClick={() => handleNavigation('/login')} className="nav-button">Вход</button>
          )
        )}

        {/* Бургер-кнопка для мобильного меню */}
        {isMobile && (
          <div className="burger-container">
            <button 
              className={`burger-button ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Меню"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        )}
      </div>

      {/* Мобильное меню */}
     {isMobile && (
  <>
    <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
      <div className="mobile-menu-content">
        <button onClick={() => handleNavigation('/')} className="nav-button">Главная</button>
              <button onClick={() => handleNavigation('/plants')} className="nav-button">Наши растения</button>
              {token && <button onClick={() => handleNavigation('/dashboard')} className="nav-button">Мое устройство</button>}
              {token && <button onClick={() => handleNavigation('/profile')} className="nav-button">Профиль</button>}
              {isAdmin && <button onClick={() => handleNavigation('/admin')} className="nav-button" style={{ color: '#f5d742' }}>👑 Админ</button>}
        {isAdmin && (
          <button 
            onClick={() => handleNavigation('/admin')} 
            className="nav-button" 
            style={{ color: '#f5d742' }}
          >
            👑 Админ
          </button>
        )}
        
        {token ? (
          <button onClick={handleLogout} className="nav-button">Выход</button>
        ) : (
          <button onClick={() => handleNavigation('/login')} className="nav-button">Вход</button>
        )}
      </div>
    </div>
    
    {isMenuOpen && (
      <div 
        className="menu-overlay" 
        onClick={() => setIsMenuOpen(false)}
      />
    )}
  </>
)}
    </nav>
  );
}

export default Navbar;
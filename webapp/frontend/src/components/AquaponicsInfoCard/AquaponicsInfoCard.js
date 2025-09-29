import React, { useState, useEffect } from 'react';
import './AquaponicsInfoCard.css';

const AQUAPONICS_FACTS = [
  "Салат в аквапонике созревает за 30 дней вместо 60 в почве. Базилик из аквапоники содержит на 15% больше эфирных масел.",
  "Идеальный pH для системы: 6.8-7.0 (нейтральная среда). Аквапоника полностью исключает использование пестицидов.",
  "Система работает бесшумно - уровень звука менее 30 дБ. Ночью растения продолжают поглощать нитраты, очищая воду для рыб.",
  "Тилапия - идеальная рыба для новичков: неприхотлива и быстро растёт. Клубника в аквапонике даёт урожай в 2 раза чаще.",
  "Система потребляет меньше энергии, чем холодильник. Кормите рыб 3 раза в день небольшими порциями для оптимального роста.",
  "Первые аквапонические системы использовались ещё ацтеками. Растения поглощают до 95% отходов жизнедеятельности рыб.",
];

const FISH_ICONS = ['🐟', '🐠', '🦐', '🐡', '🦈', '🐋'];
const PLANT_ICONS = ['🌱', '🌿', '🍀', '☘️', '🌴', '🌾', '🌻'];

const AquaponicsInfoCard = ({ deviceId }) => {
  const [currentFact, setCurrentFact] = useState('');
  const [fishIcon, setFishIcon] = useState(FISH_ICONS[0]);
  const [plantIcon, setPlantIcon] = useState(PLANT_ICONS[0]);
  const [isVisible, setIsVisible] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(15);

  const updateFactAndIcons = () => {
    setIsVisible(false);
    
    setTimeout(() => {
      setCurrentFact(AQUAPONICS_FACTS[Math.floor(Math.random() * AQUAPONICS_FACTS.length)]);
      setFishIcon(FISH_ICONS[Math.floor(Math.random() * FISH_ICONS.length)]);
      setPlantIcon(PLANT_ICONS[Math.floor(Math.random() * PLANT_ICONS.length)]);
      setIsVisible(true);
      setSecondsLeft(15);
    }, 500);
  };

  useEffect(() => {
    updateFactAndIcons();
    
    const factInterval = setInterval(updateFactAndIcons, 15000);
    const countdownInterval = setInterval(() => {
      setSecondsLeft(prev => prev > 1 ? prev - 1 : 15);
    }, 1000);
    
    return () => {
      clearInterval(factInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <div className="aquaponics-card" onClick={updateFactAndIcons}>
      <div className="card-background">
        <div className="water-bubbles">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
          <div className="bubble bubble-4"></div>
        </div>
        <div className="plant-decoration plant-left">🌿</div>
        <div className="plant-decoration plant-right">🌱</div>
      </div>

      <div className="card-header">
        <div className="device-id">СИСТЕМА #{deviceId}</div>
        <div className="card-title">Факт об аквапонике</div>
      </div>
      
      <div className="fact-container">
        <div className="fact-content">
          <p className={`fact-text ${isVisible ? 'visible' : ''}`}>{currentFact}</p>
          <div className="watermark">💧</div>
        </div>
        
        <div className="fact-icons">
          <span className="icon fish-icon">{fishIcon}</span>
          <span className="icon plant-icon">{plantIcon}</span>
        </div>
      </div>
    </div>
  );
};

export default AquaponicsInfoCard;
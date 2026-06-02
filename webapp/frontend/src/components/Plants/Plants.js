import React, { useState, useEffect } from "react";
import "./Plants.css";
import rukolaImg from "../assets/images/image 6.svg";
import bazilikImg from "../assets/images/image 17.svg";
import redisImg from "../assets/images/image 18.svg";
import plantService from "../../services/plantService";

const presetImages = {
  rukola: rukolaImg,
  bazilik: bazilikImg,
  redis: redisImg,
};

function Plants() {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showConstructor, setShowConstructor] = useState(false);
  const [plants, setPlants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState(null);

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const data = await plantService.getPlants();
        const mapped = (data.plants || []).map((plant) => ({
          ...plant,
          image: plant.image || presetImages[plant.id] || null,
        }));
        setPlants(mapped);
      } catch (err) {
        console.error("Ошибка загрузки растений:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPlants();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch("http://localhost:3000/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const [newPlant, setNewPlant] = useState({
    name: "",
    imagePreview: null,
    imageFile: null,
    description: "",
    contains: "",
  });

  const handleCardClick = (plant) => {
    setSelectedPlant(plant);
  };

  const closeModal = () => {
    setSelectedPlant(null);
  };

  const openConstructor = () => {
    setIsEditing(false);
    setEditingPlantId(null);
    setShowConstructor(true);
    setNewPlant({
      name: "",
      imagePreview: null,
      imageFile: null,
      description: "",
      contains: "",
    });
  };

  const openEditMode = (plant, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingPlantId(plant.id);
    setNewPlant({
      name: plant.name,
      imagePreview: plant.image || null,
      imageFile: null,
      description: plant.description,
      contains: Array.isArray(plant.contains) ? plant.contains.join("\n") : plant.contains,
    });
    setShowConstructor(true);
  };

  const closeConstructor = () => {
    setShowConstructor(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE_MB = 20;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`Размер файла превышает ${MAX_SIZE_MB} МБ. Пожалуйста, выберите другое изображение.`);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlant({
          ...newPlant,
          imagePreview: reader.result,
          imageFile: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlant({
      ...newPlant,
      [name]: value,
    });
  };

  const savePlant = async () => {
    if (!newPlant.name.trim()) {
      alert("Пожалуйста, введите название растения");
      return;
    }
    if (!newPlant.imagePreview) {
      alert("Пожалуйста, загрузите изображение растения");
      return;
    }
    if (!newPlant.description.trim()) {
      alert("Пожалуйста, введите описание растения");
      return;
    }
    if (!newPlant.contains.trim()) {
      alert("Пожалуйста, введите состав (витамины и минералы)");
      return;
    }

    const containsArray = newPlant.contains
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.trim());

    const payload = {
      name: newPlant.name,
      description: newPlant.description,
      contains: containsArray.length > 0 ? containsArray : [newPlant.contains],
      image: newPlant.imagePreview,
    };

    try {
      if (isEditing && editingPlantId) {
        const data = await plantService.updatePlant(editingPlantId, payload);
        const updated = data.plant;
        setPlants((prev) =>
          prev.map((p) =>
            p.id === editingPlantId
              ? { ...updated, image: updated.image || presetImages[updated.id] || null }
              : p
          )
        );
      } else {
        const plantKey =
          newPlant.name.toLowerCase().replace(/\s+/g, "_") + Date.now();
        const data = await plantService.createPlant({ id: plantKey, ...payload });
        const created = data.plant;
        setPlants((prev) => [
          ...prev,
          {
            ...created,
            image: created.image || presetImages[created.id] || null,
          },
        ]);
      }
      closeConstructor();
    } catch (err) {
      console.error(isEditing ? "Ошибка обновления растения:" : "Ошибка добавления растения:", err);
      alert(
        err.response?.data?.error ||
          (isEditing ? "Не удалось обновить растение" : "Не удалось добавить растение")
      );
    }
  };

  const deletePlant = async (plantId, e) => {
    e.stopPropagation();
    if (!window.confirm("Удалить это растение?")) return;
    try {
      await plantService.deletePlant(plantId);
      setPlants((prev) => prev.filter((plant) => plant.id !== plantId));
    } catch (err) {
      console.error("Ошибка удаления растения:", err);
      alert(
        err.response?.data?.error || "Не удалось удалить растение"
      );
    }
  };

  if (loading) {
    return (
      <div className="plants-container">
        <div className="plants-content">
          <div className="plants-grid-wrapper">
            <div className="plants-grid">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plants-container">
      <div className="plants-background">
        <div className="background-overlay"></div>
      </div>

      <div className="plants-content">
        {isAdmin && (
          <div className="constructor-button-container">
            <button className="constructor-toggle-btn" onClick={openConstructor}>
              + Добавить новое растение
            </button>
          </div>
        )}

        <div className="plants-grid-wrapper">
          <div className="plants-grid">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="plant-card"
                onClick={() => handleCardClick(plant)}
              >
                {isAdmin && (
                  <div className="plant-card-actions">
                    <button
                      className="edit-card-btn"
                      onClick={(e) => openEditMode(plant, e)}
                      title="Редактировать растение"
                    >
                      ✎
                    </button>
                    <button
                      className="delete-card-btn"
                      onClick={(e) => deletePlant(plant.id, e)}
                      title="Удалить растение"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="plant-image-container">
                  <img
                    src={plant.image}
                    alt={plant.name}
                    className="plant-image"
                  />
                </div>
                <div className="plant-name">{plant.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модальное окно конструктора */}
      {showConstructor && (
        <div className="constructor-modal-overlay" onClick={closeConstructor}>
          <div className="constructor-modal" onClick={(e) => e.stopPropagation()}>
            <button className="constructor-modal-close" onClick={closeConstructor}>
              ×
            </button>

            <div className="constructor-modal-header">
              <h2>{isEditing ? "Редактирование растения" : "Добавление нового растения"}</h2>
              <p>{isEditing ? "Измените информацию о микрозелени" : "Заполните информацию о микрозелени"}</p>
            </div>

            <div className="constructor-modal-form">
              <div className="form-field">
                <label>Название растения</label>
                <input
                  type="text"
                  name="name"
                  value={newPlant.name}
                  onChange={handleInputChange}
                  placeholder="Введите название"
                  required
                />
              </div>

              <div className="form-field">
                <label>Изображение</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input-field"
                />
                {newPlant.imagePreview && (
                  <div className="image-preview-field">
                    <img src={newPlant.imagePreview} alt="Превью" />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label>Описание</label>
                <textarea
                  name="description"
                  value={newPlant.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Введите описание растения..."
                />
              </div>

              <div className="form-field">
                <label>Состав (каждый пункт с новой строки)</label>
                <textarea
                  name="contains"
                  value={newPlant.contains}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Витамин С – укрепляет иммунитет&#10;Кальций – для костей&#10;Железо – для крови"
                />
              </div>

              <div className="form-buttons">
                <button className="cancel-btn" onClick={closeConstructor}>
                  Отмена
                </button>
                <button className="add-btn" onClick={savePlant}>
                  {isEditing ? "Сохранить изменения" : "Добавить растение"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно информации о растении */}
      {selectedPlant && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>

            <div className="modal-body">
              <div className="modal-header">
                <h2 className="modal-title">{selectedPlant.name}</h2>
              </div>

              <div className="modal-info-content">
                <div className="content-wrapper">
                  <div className="info-section">
                    <h3 className="info-title">Содержит:</h3>
                    <ul className="info-list">
                      {selectedPlant.contains.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="description-section">
                    <p className="plant-description">
                      {selectedPlant.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Plants;

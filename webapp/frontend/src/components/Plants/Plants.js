import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import plantService from '../../services/plantService';
import adminService from '../../services/adminService';
import { getPlantDesign, getPlantVitamins, preparePlant, sortPlants } from './plantDesigns';
import arrow from './assets/arrow.svg';
import addPlant from './assets/add-plant.svg';
import temperature from './assets/temperature.svg';
import conditionCircle from './assets/condition-circle.svg';
import sun from './assets/sun.svg';
import vitaminsCircle from './assets/vitamins-circle.svg';
import sprout from './assets/sprout.svg';
import './Plants.css';

const emptyPlant = { name: '', image: '', description: '', contains: '', temperature: '', light: '' };

function PlantEditor({ plant, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(plant ? {
    name: plant.name, image: plant.image || '', description: plant.description || '', contains: plant.contains.join('\n'),
    temperature: plant.temperature || '', light: plant.light || '',
  } : emptyPlant);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const imageReader = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); imageReader.current?.abort(); };
  }, []);

  const changeField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };
  const changeImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    imageReader.current?.abort();
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
      setError('Выберите изображение размером до 20 МБ.');
      event.target.value = '';
      return;
    }
    setError('');
    setReadingImage(true);
    const reader = new FileReader();
    imageReader.current = reader;
    reader.onload = () => {
      setForm((previous) => ({ ...previous, image: reader.result }));
      setReadingImage(false);
    };
    reader.onerror = () => {
      setError('Не удалось прочитать изображение. Выберите другой файл.');
      setReadingImage(false);
    };
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving || readingImage) return;
    const contains = form.contains.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!form.name.trim() || !form.description.trim() || !contains.length || !form.image) {
      setError('Заполните название, описание, состав и загрузите изображение.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), description: form.description.trim(), contains,
        temperature: form.temperature.trim(), light: form.light.trim(),
        image: plant && form.image === plant.image ? plant.sourceImage : form.image });
      onClose();
    } catch (err) {
      const sessionError = err.response?.status === 401 ||
        ['AUTH_REQUIRED', 'TOKEN_EXPIRED', 'INVALID_TOKEN'].includes(err.response?.data?.code) ||
        (err.response?.status === 403 && err.response?.data?.error === 'Недействительный или истекший токен');
      if (sessionError) {
        setError('Сессия истекла или недействительна. Выйдите из аккаунта и войдите снова.');
      } else {
        setError(err.response?.data?.error || 'Не удалось сохранить растение. Попробуйте ещё раз.');
      }
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="plants-editor" aria-labelledby="plants-editor-title"
      onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="plants-editor-body">
        <button type="button" className="plants-editor-close" aria-label="Закрыть" onClick={onClose} disabled={saving}>×</button>
        <h2 id="plants-editor-title">{plant ? 'Редактирование растения' : 'Новое растение'}</h2>
        <p className="plants-editor-intro">Заполните информацию о растении</p>
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            <label htmlFor="plant-name">Название растения</label>
            <input id="plant-name" name="name" value={form.name} onChange={changeField} placeholder="Введите название" required autoFocus />
            <label htmlFor="plant-image">Изображение</label>
            <input id="plant-image" type="file" accept="image/*" onChange={changeImage} required={!form.image} />
            {form.image && <img className="plants-editor-preview" src={form.image} alt="Предпросмотр растения" />}
            <label htmlFor="plant-description">Описание</label>
            <textarea id="plant-description" name="description" value={form.description} onChange={changeField} rows="4" placeholder="Расскажите о растении" required />
            <label htmlFor="plant-contains">Витамины и минералы</label>
            <textarea id="plant-contains" name="contains" value={form.contains} onChange={changeField} rows="3" placeholder="Каждый пункт с новой строки" required />
            <div className="plants-editor-conditions">
              <div>
                <label htmlFor="plant-temperature">Температура</label>
                <input id="plant-temperature" name="temperature" value={form.temperature} onChange={changeField} maxLength={80} placeholder="Например, 18–29 °C" />
              </div>
              <div>
                <label htmlFor="plant-light">Освещение</label>
                <input id="plant-light" name="light" value={form.light} onChange={changeField} maxLength={80} placeholder="Например, 12–16 ч/сутки" />
              </div>
            </div>
          </fieldset>
          {error && <p className="plants-form-error" role="alert">{error}</p>}
          <div className="plants-editor-buttons">
            <button type="button" className="plants-secondary-button" onClick={onClose} disabled={saving}>Отмена</button>
            <button type="submit" className="plants-primary-button" disabled={saving || readingImage}>
              {saving ? 'Сохранение…' : readingImage ? 'Загрузка фото…' : plant ? 'Сохранить изменения' : 'Добавить растение'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function PlantDetail({ plant, onBack, headingRef }) {
  const design = getPlantDesign(plant);
  const vitamins = getPlantVitamins(plant);
  return (
    <article className={`plants-detail plants-detail--${design?.theme || 'custom'}`} aria-labelledby="plants-detail-title">
      <div className="plants-detail-decoration" aria-hidden="true">
        {design?.background && <img className="plants-detail-leaves" src={design.background} alt="" />}
        {design?.secondaryBackground && <img className="plants-detail-leaves-secondary" src={design.secondaryBackground} alt="" />}
      </div>
      <button type="button" className="plants-breadcrumb" onClick={onBack}>Наши растения/{plant.name}</button>
      <div className="plants-detail-hero">
        <div className="plants-detail-photo-wrap">
          <div className="plants-detail-photo-frame">
            {plant.detailImage ? <img className={`plants-detail-photo${plant.usesDesignImage ? ' plants-photo--preset' : ''}`} src={plant.detailImage} alt={plant.name} /> : <img className="plants-detail-no-photo" src={sprout} alt="Изображение отсутствует" />}
          </div>
          {design?.branches && <img className="plants-detail-branches" src={design.branches} alt="" aria-hidden="true" />}
          {design?.topBranch && <img className="plants-detail-branch-top" src={design.topBranch} alt="" aria-hidden="true" />}
          {design?.bottomBranch && <img className="plants-detail-branch-bottom" src={design.bottomBranch} alt="" aria-hidden="true" />}
        </div>
        <div className="plants-detail-copy">
          <h1 id="plants-detail-title" ref={headingRef} tabIndex={-1}>{plant.name}</h1>
          {design?.subtitle && <p className="plants-detail-subtitle">{design.subtitle}</p>}
          <p className="plants-detail-description">{plant.description}</p>
        </div>
      </div>
      <section className="plants-conditions" aria-labelledby="plants-conditions-title">
        <div className="plants-section-heading"><h2 id="plants-conditions-title">Условия выращивания</h2><span aria-hidden="true" /></div>
        <div className="plants-conditions-grid">
          <div className="plants-condition">
            <div className="plants-condition-icon"><img className="plants-temperature-icon" src={temperature} alt="" /></div>
            <div className="plants-condition-copy"><h3>Температура</h3><p>{plant.temperature || 'Не указана'}</p></div>
          </div>
          <div className="plants-condition">
            <div className="plants-condition-icon"><img className="plants-condition-ring" src={conditionCircle} alt="" /><img className="plants-sun-icon" src={sun} alt="" /></div>
            <div className="plants-condition-copy"><h3>Освещение</h3><p>{plant.light || 'Не указано'}</p></div>
          </div>
          <div className="plants-condition plants-condition--vitamins">
            <div className="plants-condition-icon"><img className="plants-condition-ring" src={vitaminsCircle} alt="" /><img className="plants-sprout-icon" src={sprout} alt="" /></div>
            <div className="plants-condition-copy"><h3>Витамины:</h3><p>{vitamins}</p></div>
          </div>
        </div>
      </section>
    </article>
  );
}

function Plants({ token }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('plant');
  const [plants, setPlants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const canAddPlants = Boolean(token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const headingRef = useRef(null);
  const listScroll = useRef(0);
  const lastCardId = useRef(null);
  const wasDetail = useRef(false);
  const loadPlants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await plantService.getPlants();
      setPlants(sortPlants((data.plants || []).map(preparePlant)));
    } catch {
      setError('Не удалось загрузить растения. Проверьте соединение и попробуйте ещё раз.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPlants(); }, [loadPlants]);
  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    if (token) {
      adminService.checkAdmin().then(() => { if (active) setIsAdmin(true); }).catch(() => { if (active) setIsAdmin(false); });
    }
    return () => { active = false; };
  }, [token]);

  const selectedPlant = plants.find((plant) => plant.id === selectedId);
  useEffect(() => {
    if (loading) return;
    if (selectedPlant) {
      window.scrollTo(0, 0);
      headingRef.current?.focus({ preventScroll: true });
    } else if (wasDetail.current) {
      window.scrollTo(0, listScroll.current);
      document.getElementById(lastCardId.current)?.focus({ preventScroll: true });
    }
    wasDetail.current = Boolean(selectedPlant);
  }, [selectedPlant, loading]);

  const openPlant = (plant, event) => {
    listScroll.current = window.scrollY;
    lastCardId.current = event.currentTarget.id;
    const params = new URLSearchParams(searchParams);
    params.set('plant', plant.id);
    setSearchParams(params);
  };
  const backToPlants = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('plant');
    setSearchParams(params);
  };
  const savePlant = async (payload) => {
    const data = editor.plant
      ? await plantService.updatePlant(editor.plant.id, payload)
      : await plantService.createPlant({ id: `plant_${Date.now()}`, ...payload });
    const saved = preparePlant(data.plant);
    setPlants((previous) => editor.plant ? previous.map((plant) => plant.id === saved.id ? saved : plant) : [...previous, saved]);
  };
  const deletePlant = async (plant) => {
    if (!window.confirm(`Удалить растение «${plant.name}»?`)) return;
    setDeletingId(plant.id);
    try {
      await plantService.deletePlant(plant.id);
      setPlants((previous) => previous.filter((item) => item.id !== plant.id));
    } catch (err) { setError(err.response?.data?.error || 'Не удалось удалить растение. Попробуйте ещё раз.'); }
    finally { setDeletingId(null); }
  };

  return (
    <main className={`plants-page${selectedId ? ' plants-page--detail' : ''}`}>
      {!selectedId && <div className="plants-catalog-background" aria-hidden="true" />}
      <div className="plants-page-content">
        {loading ? <p className="plants-status" role="status">Загрузка растений…</p> : <>
          {error && <div className="plants-error" role="alert"><p>{error}</p><button type="button" onClick={loadPlants}>Повторить</button></div>}
          {selectedPlant ? <PlantDetail plant={selectedPlant} onBack={backToPlants} headingRef={headingRef} /> : selectedId ? (
            <div className="plants-status"><p>Растение не найдено.</p><button type="button" className="plants-secondary-button" onClick={backToPlants}>К нашим растениям</button></div>
          ) : <>
            <h1 className="plants-sr-only">Наши растения</h1>
            {!error && plants.length === 0 && <p className="plants-status">Растений пока нет.{canAddPlants && ' Добавьте первое растение.'}</p>}
            <div className="plants-catalog-grid">
              {plants.map((plant) => <article key={plant.id} className={`plants-card plants-card--${getPlantDesign(plant)?.theme || 'custom'}`}>
                <button id={`plant-card-${plant.id}`} type="button" className="plants-card-open" onClick={(event) => openPlant(plant, event)} aria-label={`Подробнее о растении ${plant.name}`}>
                  <div className="plants-card-photo-wrap">{plant.image ? <img className={`plants-card-photo${plant.usesDesignImage ? ' plants-photo--preset' : ''}`} src={plant.image} alt={plant.name} /> : <img className="plants-card-no-photo" src={sprout} alt="" />}</div>
                  <div className="plants-card-footer"><span className="plants-card-name">{plant.name}</span><img className="plants-card-arrow" src={arrow} alt="" /></div>
                </button>
                {isAdmin && <div className="plants-card-actions">
                  <button type="button" onClick={() => setEditor({ plant })} aria-label={`Редактировать ${plant.name}`} title="Редактировать растение">✎</button>
                  <button type="button" onClick={() => deletePlant(plant)} disabled={deletingId === plant.id} aria-label={`Удалить ${plant.name}`} title="Удалить растение">×</button>
                </div>}
              </article>)}
              {canAddPlants && (
                <button type="button" className="plants-card plants-card--add" onClick={() => setEditor({ plant: null })} aria-label="Добавить новое растение">
                  <div className="plants-add-art"><img src={addPlant} alt="" /></div>
                  <div className="plants-card-footer"><span className="plants-card-name">Добавить растение</span><img className="plants-card-arrow" src={arrow} alt="" /></div>
                </button>
              )}
            </div>
          </>}
        </>}
      </div>
      {editor && <PlantEditor plant={editor.plant} onClose={() => setEditor(null)} onSave={savePlant} />}
    </main>
  );
}

export default Plants;

import { useEffect, useRef, useState } from 'react';
import useSectionReveal from './useSectionReveal';
import './HomePage.css';
import background from './assets/76b24.png';
import devicePicture from './assets/52368.png';
import wifiIcon from './assets/0b003.svg';
import controlsIcon from './assets/531aa.svg';
import leafIcon from './assets/ed109.svg';
import returnRoute from './assets/cbc0d.svg';
import pumpIcon from './assets/60605.svg';
import stepCircle from './assets/96303.svg';
import fishIcon from './assets/aea47.svg';
import cycleLeafIcon from './assets/f2f1d.svg';
import filterIcon from './assets/e43ee.svg';
import waterIcon from './assets/e0ec9.svg';
import forwardRoute from './assets/23661.svg';
import temperatureIcon from './assets/674ba.svg';
import sunIcon from './assets/6a8ee.svg';
import prototypeDivider from './assets/522c4.svg';
import specificationsGrid from './assets/f5b61.svg';
import closeIcon from './assets/384b9.svg';

const features = [
  { icon: wifiIcon, title: <>Показания датчиков{' '}<br />в приложении</>, description: <>Температура среды, свет{' '}<br />и уровень воды передаются{' '}<br />в приложение по Wi-Fi.</>, benefit: <>Показания помогают проверить{' '}<br />уровень воды для рыб и условия{' '}<br />для роста растений.</> },
  { icon: controlsIcon, title: <>Управление помпой{' '}<br />и подсветкой</>, description: <>Планируем управление подачей{' '}<br />воды и освещением через{' '}<br />веб-приложение.</>, benefit: <>Это сократит число ручных{' '}<br />включений и позволит менять{' '}<br />режимы с телефона.</> },
  { icon: leafIcon, title: <>Растения над{' '}<br />вашим аквариумом</>, description: <>Контейнеры с растениями находятся{' '}<br />над аквариумом. Здесь можно{' '}<br />выращивать салаты и пряные травы.</>, benefit: <>Для них не придётся выделять{' '}<br />место под отдельную установку{' '}<br />в квартире.</> },
];
const steps = [
  { title: 'Аквариум', icon: fishIcon, text: <>Вещества от рыб поступают{' '}<br />в воду и используются{' '}<br />растениями для роста.</> },
  { title: 'Растения', icon: cycleLeafIcon, text: <>Вода поступает в контейнеры,{' '}<br />где растения получают{' '}<br />питательные вещества.</> },
  { title: 'Фильтрация', icon: filterIcon, text: <>Фильтр очищает воду{' '}<br />перед её возвращением{' '}<br />в аквариум с рыбами.</> },
  { title: 'Возврат воды', icon: waterIcon, text: <>После фильтра вода{' '}<br />возвращается в аквариум.{' '}<br />Циркуляция продолжается.</> },
];
const sensorFeatures = [
  { title: 'Температура среды', text: 'Условия вокруг установки', icon: temperatureIcon },
  { title: 'Освещённость', text: 'Свет в зоне выращивания', icon: sunIcon },
  { title: 'Уровень воды', text: 'Наполнение резервуара', icon: waterIcon },
];
const specifications = [
  ['Аквариум', '15–120 л', 'Прямоугольная форма'],
  ['Посадочные места', 'До 3 растений', 'В отдельных контейнерах'],
  ['Габариты, не более', '350 × 180 × 220 мм'],
  ['Масса без воды', 'До 1,5 кг'],
  ['Самостоятельная сборка', '20–30 минут', 'Ориентировочное время'],
  ['Планируемый уход в день', '3–5 минут'],
];

function DesignIcon({ src, className = '' }) {
  return <span className={`about-icon ${className}`} aria-hidden="true"><img src={src} alt="" /></span>;
}

function PreorderDialog({ dialogRef }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [previewComplete, setPreviewComplete] = useState(false);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const close = () => dialogRef.current.close();
  const reset = () => { setFullName(''); setPhone(''); setErrors({}); setPreviewComplete(false); };
  const submit = event => {
    event.preventDefault();
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Укажите ваше ФИО.';
    if (!/^\+?[\d\s()-]+$/.test(phone.trim()) || !/^7\d{10}$/.test(phone.replace(/\D/g, '').replace(/^8/, '7'))) {
      nextErrors.phone = 'Укажите номер телефона: +7 и 10 цифр.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { formRef.current.elements[Object.keys(nextErrors)[0]].focus(); return; }
    // Local preview: contact details are neither persisted nor sent anywhere.
    setPreviewComplete(true);
  };
  return (
    <dialog className="preorder-dialog" ref={dialogRef} aria-labelledby="preorder-title" aria-describedby="preorder-description" onClose={reset}
      onClick={event => { if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      } }}>
      <button className="preorder-close" type="button" aria-label="Закрыть форму предзаказа" onClick={close}><img src={closeIcon} alt="" /></button>
      <h2 id="preorder-title">Оформить предзаказ</h2>
      <p id="preorder-description">Оставьте контакты. Мы позвоним и расскажем<br className="preorder-desktop-break" /> об устройстве и условиях предзаказа.</p>
      {previewComplete ? <div className="preorder-preview" role="status"><h3>Форма заполнена</h3>
        <p>Это демонстрационная форма. Заявка не отправлена, контакты не сохранены.</p>
        <button type="button" className="about-button" onClick={close}>Закрыть</button>
      </div> : <form ref={formRef} onSubmit={submit} noValidate>
        <label className="preorder-field" htmlFor="preorder-name">ФИО
          <input id="preorder-name" name="fullName" autoComplete="name" autoFocus required maxLength={150} placeholder="Фамилия, имя и отчество"
            value={fullName} onChange={event => setFullName(event.target.value)} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'preorder-name-error' : undefined} />
          {errors.fullName && <span id="preorder-name-error" className="preorder-error" role="alert">{errors.fullName}</span>}
        </label>
        <label className="preorder-field" htmlFor="preorder-phone">Номер телефона
          <input id="preorder-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} placeholder="+7 (___) ___-__-__"
            value={phone} onChange={event => setPhone(event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'preorder-phone-error' : undefined} />
          {errors.phone && <span id="preorder-phone-error" className="preorder-error" role="alert">{errors.phone}</span>}
        </label>
        <button className="about-button preorder-submit" type="submit">Отправить заявку</button>
      </form>}
    </dialog>
  );
}

export default function HomePage() {
  const dialogRef = useRef(null);
  const pageRef = useRef(null);
  useSectionReveal(pageRef);
  useEffect(() => {
    // Scale the original decorative SVG wrappers, preserving each SVG's intrinsic dimensions.
    const page = pageRef.current;
    const diagram = page.querySelector('.about-cycle-diagram');
    const table = page.querySelector('.about-specification-card');
    const divider = page.querySelector('.about-prototype-divider');
    const resize = () => {
      diagram.style.setProperty('--route-scale-x', (diagram.clientWidth + 35.5) / 1345.5);
      diagram.style.setProperty('--route-scale-y', (diagram.clientHeight - 36) / 232.5);
      diagram.style.setProperty('--forward-scale-x', diagram.clientWidth / 1320);
      table.style.setProperty('--grid-scale-x', (table.clientWidth - 46) / 753);
      divider.style.setProperty('--divider-scale-x', Math.min(1, divider.clientWidth / 471));
    };
    const observer = new ResizeObserver(resize);
    [diagram, table, divider].forEach(element => observer.observe(element));
    resize();
    return () => observer.disconnect();
  }, []);
  return (
    <main className="about-page" ref={pageRef} style={{ '--about-background': `url(${background})` }}>
      <div className="about-layout">
        <section className="about-hero about-surface" aria-labelledby="about-title">
          <div className="about-hero-copy">
            <h1 id="about-title">Выращивайте рыб{' '}<br />и растения дома</h1>
            <p>Fish &amp; Greens помогает выращивать рыб и растения<br className="about-wide-break" /> в одной системе. Модуль дополняет аквариум<br className="about-wide-break" /> контейнерами для зелени и датчиками.</p>
            <p>Показания датчиков доступны в веб-приложении.<br className="about-wide-break" /> Управление помпой и светом пока дорабатываем.</p>
            <button type="button" className="about-button about-preorder" onClick={() => {
              dialogRef.current.showModal();
              dialogRef.current.querySelector('input')?.focus();
            }}>Оформить предзаказ</button>
          </div>
          <figure className="about-device"><div className="about-device-frame">
            <img className="about-device-picture" src={devicePicture} width="562" height="389" alt="Визуализация модуля Fish & Greens с контейнерами для растений и подсветкой над домашним аквариумом" />
            <div className="about-device-legend"><strong>FISH &amp; GREENS</strong><span>Визуализация</span></div>
          </div><figcaption><p>Накладной модуль для домашнего аквариума.</p><p>Набор для самостоятельной сборки.</p></figcaption></figure>
        </section>
        <section className="about-description about-surface" aria-labelledby="about-description-title">
          <h2 id="about-description-title">Что делает Fish &amp; Greens</h2>
          <p className="about-description-intro">Fish &amp; Greens помогает выращивать рыб и растения в одной системе. Мы разрабатываем набор для самостоятельной сборки.<br className="about-wide-break" />
            Он устанавливается на существующий аквариум и дополняет его контейнерами для зелени и датчиками.<br className="about-wide-break" />
            По показаниям можно следить за условиями в аквариуме и зоне выращивания растений.<br className="about-wide-break" />
            Управление помпой и подсветкой разрабатываем, чтобы сократить число ручных включений.</p>
          <div className="about-feature-grid">{features.map((feature, index) => <article className="about-feature" key={index}>
            <DesignIcon src={feature.icon} /><h3>{feature.title}</h3><p>{feature.description}</p><p>{feature.benefit}</p>
          </article>)}</div>
        </section>
      </div>
      <section className="about-cycle" aria-labelledby="about-cycle-title"><div className="about-cycle-inner">
        <h2 id="about-cycle-title">Как вода проходит через систему</h2>
        <p className="about-cycle-intro">Вода поступает к растениям, проходит фильтрацию и возвращается в аквариум.</p>
        <div className="about-cycle-diagram">
          <span className="about-return-route" aria-hidden="true"><img src={returnRoute} alt="" /></span>
          <span className="about-forward-route" aria-hidden="true"><img src={forwardRoute} alt="" /></span>
          <ol className="about-cycle-steps">{steps.map((step, index) => <li key={step.title}>
            <span className="about-step-number"><img src={stepCircle} alt="" />{String(index + 1).padStart(2, '0')}</span>
            <DesignIcon className="about-step-icon" src={step.icon} /><h3>{step.title}</h3><p>{step.text}</p>
          </li>)}</ol>
          <p className="about-pump"><DesignIcon src={pumpIcon} />Помпа поддерживает движение воды</p>
        </div>
      </div></section>
      <div className="about-layout about-lower-layout">
        <section className="about-application about-surface" aria-labelledby="about-application-title">
          <div className="about-application-copy"><h2 id="about-application-title">Следите за условиями{' '}<br />в приложении</h2>
            <p>Датчики измеряют температуру среды,{' '}<br />освещённость и уровень воды.</p>
            <h3>Что ещё разрабатываем</h3><p>Удалённую настройку режимов и уведомления<br className="about-wide-break" /> об отклонении показаний. Позже планируем<br className="about-wide-break" /> подбирать режимы для выбранных рыб и растений.</p>
          </div>
          <div className="about-sensor-list">{sensorFeatures.map(sensor => <article className="about-sensor" key={sensor.title}>
            <DesignIcon src={sensor.icon} /><div><h3>{sensor.title}</h3><p>{sensor.text}</p></div>
          </article>)}</div>
        </section>
        <section className="about-specifications" aria-labelledby="about-specifications-title">
          <div className="about-prototype about-surface"><h2 id="about-specifications-title">Планируемые{' '}<br />характеристики</h2>
            <p>Пока это планируемые значения.{' '}<br />Уточним их после испытаний.</p>
            <span className="about-prototype-divider" aria-hidden="true"><img src={prototypeDivider} alt="" /></span>
            <h3>Сейчас у нас прототип</h3><p>Собран лабораторный образец.{' '}<br />Дорабатываем корпус, электронику{' '}<br />и программную часть.</p>
          </div>
          <div className="about-specification-card"><span className="about-specifications-grid-art" aria-hidden="true"><img src={specificationsGrid} alt="" /></span>
            <dl className="about-specification-grid">{specifications.map(([label, value, note]) => <div key={label}>
              <dt>{label}</dt><dd className={label === 'Габариты, не более' ? 'about-dimensions' : undefined}>{value}</dd>
              {note && <dd className="about-specification-note">{note}</dd>}
            </div>)}<div className="about-price"><dt>Ориентир розничной цены</dt><dd>До 9 000 ₽</dd></div></dl>
          </div>
        </section>
      </div>
      <footer className="about-footer"><div><strong>Fish &amp; Greens</strong><span>Домашняя аквапоника</span></div></footer>
      <PreorderDialog dialogRef={dialogRef} />
    </main>
  );
}

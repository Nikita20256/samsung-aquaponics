import basil from './assets/basil.png';
import radish from './assets/radish.png';
import radishDetail from './assets/radish-detail.png';
import lettuceCover from './assets/lettuce-cover.png';
import lettuce from './assets/lettuce.png';
import basilBranches from './assets/basil-branches.svg';
import radishBranches from './assets/radish-branches.svg';
import branchTop from './assets/branch-top.svg';
import branchBottom from './assets/branch-bottom.svg';
import basilBackground from './assets/basil-background.svg';
import radishBackground from './assets/radish-background.svg';
import lettuceBackgroundTop from './assets/lettuce-background-top.svg';
import lettuceBackgroundBottom from './assets/lettuce-background-bottom.svg';

const designs = {
  bazilik: {
    theme: 'basil', image: basil, detailImage: basil,
    branches: basilBranches, background: basilBackground,
    subtitle: 'Ароматная микрозелень для вашего стола',
    description: 'Концентрированный источник эфирных масел: по аромату и содержанию полезных веществ она превосходит зрелый лист, а по результатам исследований входит в тройку самых питательно плотных культур среди микрозелени.',
    legacyDescription: 'Микрозелень базилика — это не только вкусная, но и очень полезная добавка к рациону, которая укрепляет здоровье и обогащает питание ценными веществами.',
    temperature: '18 - 29 °C', light: '12-16 ч/сутки', vitamins: 'С, К, А, Е, группы В',
  },
  redis: {
    theme: 'radish', image: radish, detailImage: radishDetail,
    branches: radishBranches, background: radishBackground,
    subtitle: 'Сочная микрозелень с пикантным вкусом',
    description: 'Острая нотка, в которой в несколько раз больше витамина С и природных веществ, чем в самом редисе, обладает антиоксидантными свойствами.',
    legacyDescription: 'Микрозелень редиса – это маленькое чудо природы, которое дарит нам море здоровья, вкуса и радости!',
    temperature: '13 - 24 °C', light: '10-12 ч/сутки', vitamins: 'С, А, К, В',
  },
  salat: {
    theme: 'lettuce', image: lettuceCover, detailImage: lettuce,
    topBranch: branchTop, bottomBranch: branchBottom,
    background: lettuceBackgroundTop, secondaryBackground: lettuceBackgroundBottom,
    subtitle: 'Холодостойкая и скороспелая культура',
    description: 'Переносит холодные температуры лучше многих овощей и при этом быстро созревает. Урожай можно получить несколько раз за сезон.',
    temperature: '21 - 23 °C', light: '14-16 ч/сутки', vitamins: 'К, А, В9',
  },
};

export const getPlantDesign = (plant) => designs[plant.id] || null;

export function getPlantVitamins(plant) {
  const vitaminLine = plant.contains.find((item) => /^Витамины\s*:/i.test(item));
  if (vitaminLine) return vitaminLine.replace(/^Витамины\s*:\s*/i, '').replace(/\s*\([^)]*\)/g, '').trim();
  if (getPlantDesign(plant)) {
    const vitamins = plant.contains.map((item) => item.replace(/\s*[–—(].*$/, '').replace(/^Группа\s+/i, '').trim());
    if (vitamins.length && vitamins.every((item) => /^[АВСДЕКA-EK]\d*$/i.test(item))) return vitamins.join(', ');
  }
  return plant.contains.join('; ') || getPlantDesign(plant)?.vitamins || 'Не указаны';
}

const catalogOrder = ['bazilik', 'redis', 'salat'];
export const sortPlants = (plants) => [...plants].sort((a, b) => {
  const order = (id) => catalogOrder.includes(id) ? catalogOrder.indexOf(id) : catalogOrder.length;
  return order(a.id) - order(b.id);
});

// Preserve uploaded photos and edited descriptions; update only the original seed copy.
export function preparePlant(plant) {
  const design = getPlantDesign(plant);
  return {
    ...plant,
    temperature: plant.temperature ?? design?.temperature ?? '',
    light: plant.light ?? design?.light ?? '',
    sourceImage: plant.image || null,
    usesDesignImage: !plant.image && Boolean(design?.image),
    image: plant.image || design?.image || '',
    detailImage: plant.image || design?.detailImage || '',
    description: design?.legacyDescription && plant.description === design.legacyDescription
      ? design.description : plant.description || design?.description || '',
    contains: Array.isArray(plant.contains) ? plant.contains : plant.contains ? [plant.contains] : [],
  };
}

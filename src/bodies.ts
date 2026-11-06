// Физические параметры: NASA NSSDCA Planetary Fact Sheets и JPL SSD Physical Parameters (public domain).
import { Body } from 'astronomy-engine';

export type Kind = 'star' | 'planet' | 'dwarf' | 'moon' | 'spacecraft';

export interface BodyDef {
  id: string;
  name: string;
  kind: Kind;
  parent?: string;        // id родителя (для лун)
  astro?: Body;           // тело в astronomy-engine
  massKg?: number;
  radiusKm: number;
  orbitDays?: number;     // сидерический период обращения
  dayHours?: number;      // сидерический период вращения (отрицательный = ретроградный)
  tiltDeg?: number;       // наклон оси
  color: string;          // цвет орбиты и шара-заглушки
  texture?: string;       // public/textures/<file>, если файл есть
  description: string;
}

export const BODIES: BodyDef[] = [
  { id: 'sun', name: 'Sun', kind: 'star', astro: Body.Sun, massKg: 1.989e30, radiusKm: 695700, dayHours: 609.12, tiltDeg: 7.25, color: '#ffd36b', texture: '2k_sun.jpg', description: 'Звезда в центре Солнечной системы. На неё приходится 99,86% массы системы.' },
  { id: 'mercury', name: 'Mercury', kind: 'planet', astro: Body.Mercury, massKg: 3.301e23, radiusKm: 2439.7, orbitDays: 87.969, dayHours: 1407.6, tiltDeg: 0.034, color: '#9b8fd6', texture: '2k_mercury.jpg', description: 'Самая маленькая планета и ближайшая к Солнцу.' },
  { id: 'venus', name: 'Venus', kind: 'planet', astro: Body.Venus, massKg: 4.867e24, radiusKm: 6051.8, orbitDays: 224.701, dayHours: -5832.5, tiltDeg: 177.4, color: '#e0a84a', texture: '2k_venus_atmosphere.jpg', description: 'Самая горячая планета: плотная атмосфера из CO₂ создаёт сильнейший парниковый эффект.' },
  { id: 'earth', name: 'Earth', kind: 'planet', astro: Body.Earth, massKg: 5.972e24, radiusKm: 6371.0, orbitDays: 365.256, dayHours: 23.9345, tiltDeg: 23.44, color: '#3fa9f5', texture: '2k_earth_daymap.jpg', description: 'Наш дом и единственная известная планета с жизнью.' },
  { id: 'moon', name: 'Moon', kind: 'moon', parent: 'earth', astro: Body.Moon, massKg: 7.346e22, radiusKm: 1737.4, orbitDays: 27.3217, dayHours: 655.7, tiltDeg: 6.68, color: '#bbbbbb', texture: '2k_moon.jpg', description: 'Единственный естественный спутник Земли.' },
  { id: 'mars', name: 'Mars', kind: 'planet', astro: Body.Mars, massKg: 6.417e23, radiusKm: 3389.5, orbitDays: 686.98, dayHours: 24.6229, tiltDeg: 25.19, color: '#e2643a', texture: '2k_mars.jpg', description: 'Красная планета с крупнейшим вулканом Солнечной системы, горой Олимп.' },
  { id: 'jupiter', name: 'Jupiter', kind: 'planet', astro: Body.Jupiter, massKg: 1.898e27, radiusKm: 69911, orbitDays: 4332.59, dayHours: 9.925, tiltDeg: 3.13, color: '#d9a066', texture: '2k_jupiter.jpg', description: 'Крупнейшая планета, газовый гигант с Большим красным пятном.' },
  { id: 'io', name: 'Io', kind: 'moon', parent: 'jupiter', massKg: 8.932e22, radiusKm: 1821.6, orbitDays: 1.769, color: '#e8d66b', description: 'Самое вулканически активное тело Солнечной системы.' },
  { id: 'europa', name: 'Europa', kind: 'moon', parent: 'jupiter', massKg: 4.8e22, radiusKm: 1560.8, orbitDays: 3.551, color: '#c9b79c', description: 'Ледяная луна, под корой которой скрыт подлёдный океан.' },
  { id: 'ganymede', name: 'Ganymede', kind: 'moon', parent: 'jupiter', massKg: 1.4819e23, radiusKm: 2634.1, orbitDays: 7.155, color: '#a39a8c', description: 'Крупнейший спутник в Солнечной системе.' },
  { id: 'callisto', name: 'Callisto', kind: 'moon', parent: 'jupiter', massKg: 1.0759e23, radiusKm: 2410.3, orbitDays: 16.689, color: '#7d7468', description: 'Одно из самых кратерированных тел Солнечной системы.' },
  { id: 'saturn', name: 'Saturn', kind: 'planet', astro: Body.Saturn, massKg: 5.683e26, radiusKm: 58232, orbitDays: 10759.22, dayHours: 10.656, tiltDeg: 26.73, color: '#e8cf8f', texture: '2k_saturn.jpg', description: 'Газовый гигант с самой заметной системой колец.' },
  { id: 'uranus', name: 'Uranus', kind: 'planet', astro: Body.Uranus, massKg: 8.681e25, radiusKm: 25362, orbitDays: 30685.4, dayHours: -17.24, tiltDeg: 97.77, color: '#8fd8e0', texture: '2k_uranus.jpg', description: 'Ледяной гигант, вращающийся «лёжа на боку».' },
  { id: 'neptune', name: 'Neptune', kind: 'planet', astro: Body.Neptune, massKg: 1.024e26, radiusKm: 24622, orbitDays: 60189, dayHours: 16.11, tiltDeg: 28.32, color: '#4f6fe8', texture: '2k_neptune.jpg', description: 'Самая далёкая планета, на ней самые быстрые ветра в системе.' },
  { id: 'pluto', name: 'Pluto', kind: 'dwarf', astro: Body.Pluto, massKg: 1.303e22, radiusKm: 1188.3, orbitDays: 90560, dayHours: -153.29, tiltDeg: 122.53, color: '#b08f74', description: 'Карликовая планета в поясе Койпера. Её изучил New Horizons в 2015 году.' },
];

// Космические аппараты: траектории из JPL Horizons (scripts/fetch-horizons.mjs → public/data/spacecraft/<id>.json)
export const SPACECRAFT = [
  { id: 'voyager-1', name: 'Voyager 1', horizons: '-31' },
  { id: 'voyager-2', name: 'Voyager 2', horizons: '-32' },
  { id: 'pioneer-10', name: 'Pioneer 10', horizons: '-23' },
  { id: 'pioneer-11', name: 'Pioneer 11', horizons: '-24' },
  { id: 'new-horizons', name: 'New Horizons', horizons: '-98' },
  { id: 'parker-solar-probe', name: 'Parker Solar Probe', horizons: '-96' },
  { id: 'juno', name: 'Juno', horizons: '-61' },
  { id: 'europa-clipper', name: 'Europa Clipper', horizons: '-159' },
  { id: 'juice', name: 'Juice', horizons: '-28' },
  { id: 'lucy', name: 'Lucy', horizons: '-49' },
  { id: 'psyche', name: 'Psyche', horizons: '-255' },
];

# Solar Explorer

Интерактивная 3D-модель Солнечной системы в реальном времени, вдохновлённая NASA/JPL «Eyes on the Solar System». Независимый проект, не связан с NASA и не одобрен ею. План работ: [PLAN.md](PLAN.md).

## Запуск

```bash
npm install
npm run dev                # http://localhost:5173
npm run fetch:horizons     # необязательно: траектории КА из JPL Horizons → public/data/spacecraft/
```

**Текстуры.** Скачайте 2K-текстуры с https://www.solarsystemscope.com/textures/ (CC BY 4.0) и положите в `public/textures/`: `2k_sun.jpg`, `2k_mercury.jpg`, `2k_venus_atmosphere.jpg`, `2k_earth_daymap.jpg`, `2k_moon.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg`, `2k_saturn.jpg`, `2k_uranus.jpg`, `2k_neptune.jpg`. Пока файлов нет, тела рисуются цветными шарами.

**Адреса:** `#/home`, `#/earth`, `#/saturn`, `#/voyager-1`… Параметр `?lighting=flood` включает заливающий свет.

## Что уже работает
- Положения и скорости Солнца, 8 планет, Плутона, Луны и галилеевых спутников на текущий момент
- Орбиты с затуханием, подписи с маркерами, клик по объекту → плавный подлёт камеры
- Инфопанель: масса, радиус, периоды, наклон оси, живые расстояния до Солнца и Земли, скорость
- Таймлайн: от −1 года/с до +1 года/с, пауза, REAL RATE, LIVE
- Кольца Сатурна, свечение Солнца, режим flood, поиск, меню
- Космические аппараты появляются автоматически после `npm run fetch:horizons`

## Open source и открытые данные

### Код
| Проект | Назначение | Лицензия |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | WebGL-рендеринг, OrbitControls | MIT |
| [astronomy-engine](https://github.com/cosinekitty/astronomy) (Don Cross) | Эфемериды планет, Луны и спутников Юпитера (VSOP87, ELP/MPP02, L1.2) | MIT |
| [@tweenjs/tween.js](https://github.com/tweenjs/tween.js) | Анимации (зарезервировано для историй) | MIT |
| [Vite](https://github.com/vitejs/vite) | Сборка и dev-сервер | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | Язык | Apache-2.0 |
| [Montserrat](https://fonts.google.com/specimen/Montserrat) | Шрифт | SIL OFL 1.1 |

### Данные
| Источник | Что берём | Лицензия |
|---|---|---|
| [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Траектории космических аппаратов (векторы, км) | Public domain (NASA/JPL) |
| [NASA NSSDCA Planetary Fact Sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | Масса, радиус, периоды, наклон оси | Public domain |
| [JPL SSD Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html) | Физические параметры планет и спутников | Public domain |
| [Solar System Scope Textures](https://www.solarsystemscope.com/textures/) | Текстуры планет (по желанию) | CC BY 4.0 |

### В планах (см. PLAN.md)
NAIF SPICE kernels (DE440, спутники), JPL Small-Body Database, MPC MPCORB, каталог звёзд HYG (CC BY-SA 4.0), NASA 3D Resources (модели КА), NASA Trek (тайлы поверхности).

## Отличия от оригинала
- Движок Pioneer и код eyes.nasa.gov не используются: они не опубликованы как open source. Всё написано заново.
- Логотип и брендинг NASA не используются.
- Звёздный фон пока процедурный. Наклон осей задан упрощённо, без ориентации полюсов по IAU.

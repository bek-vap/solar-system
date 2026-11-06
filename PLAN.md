# План: клон «Eyes on the Solar System»

## 1. Анализ оригинала (eyes.nasa.gov/apps/solar-system)

**Технологии (снято из браузера):**
- Рендер: **three.js r185** (`window.__THREE__ = "185"`).
- Движок: **Pioneer**, собственная разработка NASA/JPL (`window.Pioneer`, `PioneerScripts`). Классы: `Engine`, `Scene`, `Entity`, `OrbitController`, `OrbitalElementsController`, `DynamoController`, `AtmosphereComponent`, `RingsComponent`, `CometTailComponent`, `CMTSComponent` (тайлы поверхностей), `LabelComponent`, `TrailComponent`, `FreeFlyController`, `PickController` и др.
- Исходники Pioneer **не опубликованы** (публичного репозитория нет). Поэтому повторяем его архитектуру своим кодом на open source.
- Бандлы: `config.js`, `commons.js`, `preload.js`, `vendors.js`, `app.js` + CSS.
- Данные: `eyes.nasa.gov/assets/static/{models,sprites,stars}`, `assets/dynamic/dynamo` (эфемериды), `autoplay.json` (истории/события).
- Аналитика (не копируем): DAP, Google Tag Manager, YouTube iframe API.

**UI / функции:**
- Загрузочный экран (логотип + «LOADING» + прогресс-бар).
- Шапка: логотип и «EYES ON THE SOLAR SYSTEM», меню-бургер справа.
- 3D-сцена: Солнце, 8 планет, луны, орбиты разных цветов, подписи (планеты крупно, КА с иконкой-шестиугольником), фон из звёзд.
- Космические аппараты: Voyager 1/2, Pioneer 10/11, New Horizons, Juno, Europa Clipper, Juice, Lucy, Psyche, Parker, STEREO и др. + кометы (3I/ATLAS).
- Карточки событий (Roman Launch, Psyche Mars flyby, Artemis II, Voyager's Grand Tour) — открывают сценарии-«истории».
- Таймлайн внизу: ползунок времени, «REAL RATE», ускорение/реверс, «Live».
- Роуты через hash: `#/home`, `#/<объект>`, `#/story/<id>`, параметры `?lighting=flood|natural`, `surfaceMapTiling=true`.
- Страница объекта: подлёт камеры, панель с описанием и характеристиками, переключение «вид с КА».
- Поиск объектов, настройки (свет, подписи, орбиты, полноэкранный режим, инфо).

## 2. Open source стек для клона

| Задача | Библиотека / данные | Лицензия |
|---|---|---|
| 3D | three.js | MIT |
| Сборка | Vite + TypeScript | MIT |
| UI | Vanilla TS или Preact | MIT |
| Анимация камеры | @tweenjs/tween.js | MIT |
| Время, даты | Luxon | MIT |
| Позиции планет | astronomy-engine (Don Cross) | MIT |
| Орбиты КА | NASA JPL Horizons API → предрасчёт в JSON | данные NASA, public domain |
| Точные эфемериды (опционально) | SPICE-ядра NAIF (через spiceypy в скриптах) | public domain / MIT |
| Текстуры планет | Solar System Scope textures | CC BY 4.0 |
| Модели КА | NASA 3D Resources (github.com/nasa/NASA-3D-Resources) | NASA media guidelines |
| Звёзды | каталог HYG (astronexus) | CC BY-SA 4.0 |
| Тайлы поверхности (LOD) | NASA Trek WMTS / OpenPlanetaryMap | public domain |
| Шрифт | Inter / Montserrat (Google Fonts) | OFL |

## 2.1 Открытые данные: координаты, скорости, массы

«Реальное время» здесь — это расчёт положения на текущий момент по эфемеридам, а не поток телеметрии. Так же работает и оригинал.

**Координаты и скорости (эфемериды):**
| Источник | Что даёт | Как используем |
|---|---|---|
| **JPL Horizons API** (`ssd.jpl.nasa.gov/api/horizons.api`) | Векторы X/Y/Z и VX/VY/VZ на любую дату для планет, ~400 спутников, космических аппаратов, астероидов и комет. В заголовке ответа есть физические параметры. | Основной источник. CORS нет (проверено: из браузера запрос падает), поэтому скрипт `scripts/fetch-horizons.ts` выгружает данные в JSON, а при необходимости работает прокси на сервере. |
| **NAIF SPICE kernels**: DE440/DE441 (планеты), sat441 (Сатурн), jup365 (Юпитер), ura111, nep097, mar097, а также ядра аппаратов | Самые точные эфемериды NASA, их же использует Horizons | Предрасчёт через `spiceypy` (MIT) или `timecraftjs` (SPICE в WASM, MIT) прямо в браузере |
| **astronomy-engine** (MIT) | Планеты, Луна, спутники Юпитера, Плутон — офлайн, в браузере, с точностью до угловой минуты | Быстрый расчёт «на лету» для 60 FPS, без сервера |
| **VSOP87 / ELP2000** | Аналитические теории планет и Луны | Запасной вариант, уже входит в astronomy-engine |
| **JPL Small-Body Database API** (`ssd-api.jpl.nasa.gov/sbdb.api`) | Орбитальные элементы, массы и размеры астероидов и комет | Кеплеровы орбиты для малых тел |
| **MPC MPCORB.DAT** (Minor Planet Center) | Элементы орбит более чем 1,3 млн астероидов | Слой «все астероиды» точками на GPU |
| **CelesTrak** | TLE-орбиты спутников Земли (МКС и др.) | Опционально, с расчётом через `satellite.js` (MIT) |

**Физические параметры (масса, GM, радиус, плотность, период вращения, наклон оси, полюс):**
| Источник | Что даёт |
|---|---|
| JPL SSD «Planetary Physical Parameters» и «Planetary Satellite Physical Parameters» | Масса и GM, радиусы, плотность, альбедо для планет и спутников |
| JPL «Planetary Satellite Mean Elements» | Средние орбитальные элементы всех спутников |
| NASA NSSDCA Planetary Fact Sheets | Полные таблицы: масса, диаметр, гравитация, температура, длительность суток, атмосфера |
| IAU WGCCRE Report (2015) | Ориентация полюсов и вращение тел, чтобы планеты правильно крутились |
| JPL SBDB | Физические данные малых тел |

**Конвейер данных:**
1. `scripts/fetch-physical.ts` собирает массы, радиусы и периоды в `data/bodies.json`.
2. `scripts/fetch-horizons.ts` выгружает траектории аппаратов и спутников с адаптивным шагом в `data/ephem/*.json` (сжатие: Чебышёв или Эрмит).
3. В браузере планеты считает astronomy-engine, а остальное интерполируется из JSON. Скорость берём как производную или из векторов Horizons.
4. Инфопанель показывает живые значения: расстояние до Солнца и Земли, скорость, массу, радиус.
5. Скрипт раз в сутки обновляет данные, например через GitHub Actions.

Все перечисленные данные NASA/JPL — public domain. Источники указываем в README.

## 3. Архитектура (аналог Pioneer)

```
src/
  engine/   Engine, Scene, Entity, Component, Controller, Time
  components/  Model, Sphere(Planet), Atmosphere, Rings, Trail(Orbit), Label, Starfield, CometTail
  controllers/ OrbitalElements, Ephemeris(keyframes), Rotation, CameraOrbit, CameraFly
  data/     entities.json, missions/*.json, stories/*.json
  ui/       Loader, Header, Menu, EventCards, Timeline, InfoPanel, Search, Settings
  router.ts hash-роутер (#/home, #/earth, #/story/...)
scripts/    fetch-horizons.ts — выгрузка траекторий КА
public/     textures/, models/, stars/
```
Важно: логарифмический буфер глубины и «floating origin» (сцена вокруг камеры) — без этого масштабы Солнечной системы дрожат.

## 4. Этапы

1. **Каркас**: Vite + TS + three.js, загрузчик, шапка, hash-роутер.
2. **Сцена и время**: Солнце, планеты по astronomy-engine, орбиты, звёзды HYG, подписи, глобальные часы.
3. **Камера**: орбитальное управление, плавный подлёт к объекту, клик-выбор.
4. **Таймлайн**: ползунок, скорости, «Live».
5. **Детали тел**: текстуры, атмосферы, кольца, луны, ночная сторона Земли, режимы освещения.
6. **Космические аппараты**: Horizons → JSON, модели glTF, следы траекторий.
7. **UI контента**: карточки событий, инфопанель, поиск, меню и настройки.
8. **Истории**: JSON-сценарии (камера + время + текст), например Voyager's Grand Tour.
9. **Полировка**: LOD-тайлы, мобильная вёрстка, производительность.
10. **README** со списком open source и лицензиями/атрибуциями.

## 5. Юридические ограничения
- **Нельзя** использовать логотип NASA («meatball»), название «NASA's Eyes» и брендинг. Нужно своё название и логотип, внешний вид при этом можно сделать близким.
- Код и бандлы с eyes.nasa.gov не копируем: Pioneer не опубликован под open source лицензией.
- Изображения и данные NASA в основном public domain, но требуют упоминания источника. CC BY-текстуры требуют атрибуции в README.

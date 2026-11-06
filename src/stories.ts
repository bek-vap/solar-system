// Истории: последовательность шагов (время, скорость, фокус камеры, дистанция, текст).
// Даты событий взяты из пресс-материалов NASA/JPL.
export interface StoryStep {
  time: string;          // ISO UTC
  focus: string;         // id объекта или 'home'
  distanceKm?: number;   // дистанция камеры
  rate?: number;         // сим-секунд за секунду (по умолчанию пауза = 0)
  title: string;
  text: string;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  steps: StoryStep[];
}

const D = 86400;

export const STORIES: Story[] = [
  {
    id: 'voyager-grand-tour', title: "Voyager's Grand Tour", subtitle: '1977 – сегодня', icon: '🛰',
    steps: [
      { time: '1977-09-06T00:00:00Z', focus: 'earth', distanceKm: 3e7, rate: D, title: 'Старт', text: 'В 1977 году с разницей в 16 дней стартуют Voyager 2 (20 августа) и Voyager 1 (5 сентября). Редкий парад планет позволяет облететь все четыре гиганта.' },
      { time: '1979-03-05T12:00:00Z', focus: 'jupiter', distanceKm: 1.2e7, rate: 3600 * 4, title: 'Voyager 1 у Юпитера', text: '5 марта 1979 года. Voyager 1 открывает активные вулканы на Ио — первые, найденные за пределами Земли.' },
      { time: '1979-07-09T22:00:00Z', focus: 'voyager-2', distanceKm: 2e7, rate: 3600 * 4, title: 'Voyager 2 у Юпитера', text: '9 июля 1979 года. Voyager 2 получает детальные снимки Европы, которые позже наведут на мысль о подлёдном океане.' },
      { time: '1981-08-26T03:00:00Z', focus: 'saturn', distanceKm: 1.5e7, rate: 3600 * 4, title: 'Voyager 2 у Сатурна', text: '26 августа 1981 года. Гравитационный манёвр у Сатурна направляет аппарат к Урану.' },
      { time: '1986-01-24T18:00:00Z', focus: 'uranus', distanceKm: 5e6, rate: 3600 * 2, title: 'Voyager 2 у Урана', text: '24 января 1986 года. Первый и пока единственный визит к Урану: открыто 10 новых спутников и два кольца.' },
      { time: '1989-08-25T04:00:00Z', focus: 'neptune', distanceKm: 5e6, rate: 3600 * 2, title: 'Voyager 2 у Нептуна', text: '25 августа 1989 года. Пролёт над северным полюсом Нептуна завершает Большое турне.' },
      { time: '2012-08-25T00:00:00Z', focus: 'voyager-1', distanceKm: 3e9, rate: D * 30, title: 'Межзвёздное пространство', text: '25 августа 2012 года Voyager 1 пересекает гелиопаузу и становится первым рукотворным объектом в межзвёздном пространстве. Voyager 2 делает то же 5 ноября 2018 года.' },
      { time: 'now', focus: 'voyager-1', distanceKm: 3e9, rate: 1, title: 'Сегодня', text: 'Оба аппарата всё ещё передают данные — это самая дальняя связь в истории человечества.' },
    ],
  },
  {
    id: 'psyche-mars-flyby', title: 'Psyche Mars Gravity Assist', subtitle: 'Пролёт Марса 15 мая 2026', icon: '🪐',
    steps: [
      { time: '2023-10-14T00:00:00Z', focus: 'earth', distanceKm: 3e7, rate: D * 5, title: 'Старт', text: '13 октября 2023 года Psyche стартует на Falcon Heavy к металлическому астероиду (16) Психея.' },
      { time: '2026-04-15T00:00:00Z', focus: 'psyche', distanceKm: 3e7, rate: D, title: 'Сближение с Марсом', text: 'Солнечно-электрические двигатели на эффекте Холла плавно разгоняют аппарат к Марсу.' },
      { time: '2026-05-15T00:00:00Z', focus: 'mars', distanceKm: 2e6, rate: 600, title: 'Гравитационный манёвр', text: 'Гравитация Марса меняет наклон и скорость траектории — бесплатный разгон к поясу астероидов.' },
      { time: '2026-06-01T00:00:00Z', focus: 'psyche', distanceKm: 3e8, rate: D * 10, title: 'Курс на Психею', text: 'Прибытие к астероиду запланировано на август 2029 года.' },
    ],
  },
  {
    id: 'new-horizons-pluto', title: 'New Horizons у Плутона', subtitle: 'Пролёт 14 июля 2015', icon: '❄',
    steps: [
      { time: '2006-01-20T00:00:00Z', focus: 'earth', distanceKm: 5e7, rate: D * 3, title: 'Самый быстрый старт', text: '19 января 2006 года New Horizons уходит от Земли быстрее любого аппарата до него.' },
      { time: '2007-02-28T00:00:00Z', focus: 'jupiter', distanceKm: 3e7, rate: 3600 * 6, title: 'Разгон у Юпитера', text: 'Гравитационный манёвр у Юпитера сокращает путь к Плутону на три года.' },
      { time: '2015-07-14T11:50:00Z', focus: 'pluto', distanceKm: 1e6, rate: 600, title: 'Пролёт Плутона', text: '14 июля 2015 года, 12 500 км над поверхностью. Открыта ледяная равнина Спутника в форме сердца.' },
      { time: '2019-01-01T05:33:00Z', focus: 'new-horizons', distanceKm: 1e9, rate: D * 20, title: 'Аррокот', text: '1 января 2019 года — пролёт объекта пояса Койпера Аррокот, самого далёкого из изученных вблизи.' },
    ],
  },
  {
    id: 'parker-perihelion', title: 'Parker Solar Probe', subtitle: 'Рекордное сближение 24 декабря 2024', icon: '☀',
    steps: [
      { time: '2018-08-13T00:00:00Z', focus: 'earth', distanceKm: 3e7, rate: D * 2, title: 'Старт', text: '12 августа 2018 года стартует миссия, которая «коснётся Солнца».' },
      { time: '2024-12-17T00:00:00Z', focus: 'parker-solar-probe', distanceKm: 5e7, rate: 3600 * 3, title: 'Рекордное сближение', text: '24 декабря 2024 года — 6,1 млн км от поверхности Солнца на скорости около 192 км/с. Это самый быстрый объект, созданный человеком.' },
    ],
  },
  {
    id: 'juno-jupiter', title: 'Juno у Юпитера', subtitle: 'Выход на орбиту 5 июля 2016', icon: '🌀',
    steps: [
      { time: '2011-08-06T00:00:00Z', focus: 'earth', distanceKm: 3e7, rate: D * 3, title: 'Старт', text: '5 августа 2011 года Juno стартует к Юпитеру.' },
      { time: '2013-10-09T19:21:00Z', focus: 'earth', distanceKm: 1e7, rate: 3600, title: 'Пролёт Земли', text: '9 октября 2013 года гравитационный манёвр у Земли добавляет 7,3 км/с.' },
      { time: '2016-07-01T00:00:00Z', focus: 'jupiter', distanceKm: 2e7, rate: 3600 * 6, title: 'Выход на орбиту', text: '5 июля 2016 года Juno выходит на полярную орбиту и начинает изучать недра и полярные сияния Юпитера.' },
    ],
  },
];

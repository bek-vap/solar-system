// Выгружает траектории КА из JPL Horizons API (public domain) в public/data/spacecraft/<id>.json
// Формат: { t: [unix ms], p: [[x,y,z] км] } — гелиоцентрическая эклиптика J2000 (как в приложении).
// Основная траектория берётся с крупным шагом, а вокруг пролётов («окна») с шагом 10 минут.
// При конвертации всё сливается в один отсортированный массив.
//
// Режимы:
//   npm run fetch:horizons              — скачать напрямую (нужен доступ к ssd.jpl.nasa.gov из Node)
//   npm run fetch:horizons -- --links   — создать horizons-raw/links.html: открыть ссылки в браузере (с VPN)
//                                          и сохранить каждый ответ в horizons-raw/ под указанным именем
//   npm run fetch:horizons -- --raw     — конвертировать сохранённые файлы из horizons-raw/
// Прокси (Node 24): $env:NODE_USE_ENV_PROXY=1; $env:HTTPS_PROXY="http://127.0.0.1:PORT"
import { writeFile, readFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../public/data/spacecraft/', import.meta.url);
const RAW = new URL('../horizons-raw/', import.meta.url);

// [id, Horizons ID, начало, конец, шаг, окна пролётов: [метка, дата максимального сближения]]
const CRAFT = [
  ['voyager-1', '-31', '1977-09-06', '2030-01-01', '5 d', [['jupiter', '1979-03-05'], ['saturn', '1980-11-12']]],
  ['voyager-2', '-32', '1977-08-21', '2030-01-01', '5 d', [['jupiter', '1979-07-09'], ['saturn', '1981-08-26'], ['uranus', '1986-01-24'], ['neptune', '1989-08-25']]],
  ['pioneer-10', '-23', '1972-03-04', '2030-01-01', '10 d', [['jupiter', '1973-12-04']]],
  ['pioneer-11', '-24', '1973-04-07', '2030-01-01', '10 d', [['jupiter', '1974-12-03'], ['saturn', '1979-09-01']]],
  ['new-horizons', '-98', '2006-01-20', '2030-01-01', '2 d', [['jupiter', '2007-02-28'], ['pluto', '2015-07-14']]],
  ['parker-solar-probe', '-96', '2018-08-13', '2025-12-31', '6 h', [['perihelion-22', '2024-12-24']]],
  ['juno', '-61', '2011-08-06', '2025-12-31', '1 d', [['earth', '2013-10-09'], ['joi', '2016-07-05']]],
  ['europa-clipper', '-159', '2024-10-15', '2030-12-31', '1 d', [['mars', '2025-03-01']]],
  ['juice', '-28', '2023-04-15', '2031-07-20', '1 d', [['earth-moon', '2024-08-20'], ['venus', '2025-08-31']]],
  ['lucy', '-49', '2021-10-17', '2033-01-01', '1 d', [['earth-1', '2022-10-16'], ['earth-2', '2024-12-13']]],
  ['psyche', '-255', '2023-10-14', '2029-02-24', '1 d', [['mars', '2026-05-15']]],
];

const WINDOW_DAYS = 2;   // ±2 суток вокруг даты пролёта
const WINDOW_STEP = '10 m';

const shift = (date, days) => new Date(Date.parse(date) + days * 86400e3).toISOString().slice(0, 16).replace('T', ' ');

/** Все сегменты одного КА: основной и окна. */
function segments([id, cmd, start, stop, step, windows = []]) {
  return [
    { file: `${id}.json`, cmd, start, stop, step },
    ...windows.map(([label, date]) => ({ file: `${id}__${label}.json`, cmd, start: shift(date, -WINDOW_DAYS), stop: shift(date, WINDOW_DAYS), step: WINDOW_STEP })),
  ];
}

function url({ cmd, start, stop, step }) {
  const q = new URLSearchParams({
    format: 'json', COMMAND: `'${cmd}'`, EPHEM_TYPE: 'VECTORS', CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF', OUT_UNITS: 'KM-S', VEC_TABLE: '1', CSV_FORMAT: 'YES',
    START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: `'${step}'`,
  });
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${q}`;
}

function parse({ result, error }) {
  if (error) throw new Error(error);
  const body = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(result.slice(0, 400)); // Horizons часто просит уточнить даты покрытия
  return body.trim().split('\n').map((line) => {
    const c = line.split(',').map((s) => s.trim());
    return [Math.round((+c[0] - 2440587.5) * 86400000), [+(+c[2]).toFixed(0), +(+c[3]).toFixed(0), +(+c[4]).toFixed(0)]];
  });
}

async function load(seg, mode) {
  return mode === '--raw'
    ? JSON.parse(await readFile(new URL(seg.file, RAW), 'utf8'))
    : await (await fetch(url(seg))).json();
}

const errText = (e) => (e.code === 'ENOENT' ? 'нет файла в horizons-raw/' : e.message) + (e.cause ? ` → ${e.cause.code ?? ''} ${e.cause.message ?? e.cause}` : '');

const mode = process.argv[2];
await mkdir(OUT, { recursive: true });

if (mode === '--links') {
  await mkdir(RAW, { recursive: true });
  const rows = CRAFT.map((c) => `<li><b>${c[0]}</b><ul>${segments(c).map((s) =>
    `<li><a href="${url(s).replace(/&/g, '&amp;')}" target="_blank">${s.file === `${c[0]}.json` ? 'вся траектория' : s.file.split('__')[1].replace('.json', '')}</a> → <code>${s.file}</code></li>`).join('')}</ul></li>`).join('\n');
  await writeFile(new URL('links.html', RAW), `<!doctype html><meta charset="utf-8"><title>Horizons</title>
<style>body{font-family:sans-serif;max-width:800px;margin:30px auto;line-height:1.6}code{background:#eee;padding:1px 4px}</style>
<h2>Траектории JPL Horizons</h2>
<p>Откройте каждую ссылку (с включённым VPN), нажмите Ctrl+S и сохраните файл в папку <b>horizons-raw</b> под указанным именем.
Если «вся траектория» уже скачана раньше, её можно пропустить. Затем выполните <code>npm run fetch:horizons -- --raw</code>.</p><ol>${rows}</ol>`);
  console.log(`Создан horizons-raw/links.html (${CRAFT.reduce((n, c) => n + segments(c).length, 0)} ссылок) — откройте его в браузере.`);
} else {
  for (const c of CRAFT) {
    const points = new Map();
    const notes = [];
    for (const seg of segments(c)) {
      try { for (const [t, p] of parse(await load(seg, mode))) points.set(t, p); }
      catch (e) { notes.push(`${seg.file}: ${errText(e)}`); }
    }
    if (!points.size) { console.warn(`✗ ${c[0]}: ${notes.join('; ')}`); continue; }
    const t = [...points.keys()].sort((a, b) => a - b);
    await writeFile(new URL(`${c[0]}.json`, OUT), JSON.stringify({ t, p: t.map((k) => points.get(k)) }));
    console.log(`✓ ${c[0]}: ${t.length} точек${notes.length ? `  (пропущено: ${notes.join('; ')})` : ''}`);
  }
}

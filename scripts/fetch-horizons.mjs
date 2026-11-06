// Выгружает траектории КА из JPL Horizons API (public domain) в public/data/spacecraft/<id>.json
// Формат: { t: [unix ms], p: [[x,y,z] км] } — гелиоцентрическая эклиптика J2000 (как в приложении).
//
// Режимы:
//   npm run fetch:horizons              — скачать напрямую (нужен доступ к ssd.jpl.nasa.gov из Node)
//   npm run fetch:horizons -- --links   — создать horizons-raw/links.html: открыть ссылки в браузере (с VPN)
//                                          и сохранить каждый ответ как horizons-raw/<id>.json
//   npm run fetch:horizons -- --raw     — конвертировать сохранённые файлы из horizons-raw/
// Прокси (Node 24): $env:NODE_USE_ENV_PROXY=1; $env:HTTPS_PROXY="http://127.0.0.1:PORT"
import { writeFile, readFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../public/data/spacecraft/', import.meta.url);
const RAW = new URL('../horizons-raw/', import.meta.url);
const CRAFT = [
  ['voyager-1', '-31', '1977-09-06', '2030-01-01', '5 d'],
  ['voyager-2', '-32', '1977-08-21', '2030-01-01', '5 d'],
  ['pioneer-10', '-23', '1972-03-04', '2030-01-01', '10 d'],
  ['pioneer-11', '-24', '1973-04-07', '2030-01-01', '10 d'],
  ['new-horizons', '-98', '2006-01-20', '2030-01-01', '2 d'],
  ['parker-solar-probe', '-96', '2018-08-13', '2025-12-31', '6 h'],
  ['juno', '-61', '2011-08-06', '2025-12-31', '1 d'],
  ['europa-clipper', '-159', '2024-10-15', '2030-12-31', '1 d'],
  ['juice', '-28', '2023-04-15', '2031-07-20', '1 d'],
  ['lucy', '-49', '2021-10-17', '2033-01-01', '1 d'],
  ['psyche', '-255', '2023-10-14', '2029-02-24', '1 d'],
];

function url([, cmd, start, stop, step]) {
  const q = new URLSearchParams({
    format: 'json', COMMAND: `'${cmd}'`, EPHEM_TYPE: 'VECTORS', CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF', OUT_UNITS: 'KM-S', VEC_TABLE: '1', CSV_FORMAT: 'YES',
    START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: `'${step}'`,
  });
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${q}`;
}

async function convert(id, { result, error }) {
  if (error) throw new Error(error);
  const body = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(result.slice(0, 400)); // Horizons часто просит уточнить даты покрытия
  const t = [], p = [];
  for (const line of body.trim().split('\n')) {
    const c = line.split(',').map((s) => s.trim());
    t.push(Math.round((+c[0] - 2440587.5) * 86400000));
    p.push([+(+c[2]).toFixed(0), +(+c[3]).toFixed(0), +(+c[4]).toFixed(0)]);
  }
  await writeFile(new URL(`${id}.json`, OUT), JSON.stringify({ t, p }));
  console.log(`✓ ${id}: ${t.length} точек`);
}

const mode = process.argv[2];
await mkdir(OUT, { recursive: true });

if (mode === '--links') {
  await mkdir(RAW, { recursive: true });
  const rows = CRAFT.map((c) => `<li><a href="${url(c).replace(/&/g, '&amp;')}" target="_blank">${c[0]}</a> → сохранить как <code>${c[0]}.json</code></li>`).join('\n');
  await writeFile(new URL('links.html', RAW), `<!doctype html><meta charset="utf-8"><title>Horizons</title>
<h2>Траектории JPL Horizons</h2>
<p>Откройте каждую ссылку (с включённым VPN), нажмите Ctrl+S и сохраните файл в папку <b>horizons-raw</b> под указанным именем.
Затем выполните <code>npm run fetch:horizons -- --raw</code>.</p><ol>${rows}</ol>`);
  console.log('Создан horizons-raw/links.html — откройте его в браузере.');
} else {
  for (const c of CRAFT) {
    try {
      const data = mode === '--raw'
        ? JSON.parse(await readFile(new URL(`${c[0]}.json`, RAW), 'utf8'))
        : await (await fetch(url(c))).json();
      await convert(c[0], data);
    } catch (e) {
      const cause = e.cause ? ` → ${e.cause.code ?? ''} ${e.cause.message ?? e.cause}` : '';
      console.warn(`✗ ${c[0]}: ${e.code === 'ENOENT' ? 'нет файла в horizons-raw/' : e.message}${cause}`);
    }
  }
}

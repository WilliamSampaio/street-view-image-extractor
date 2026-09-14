import { TILE_SIZE, tileUrls, zoomLevels } from './lib/pano.js';
import { injectGPano } from './lib/xmp.js';
import { fetchPanoOrientation } from './lib/metadata.js';
import { buildOrientation } from './lib/orientation.js';

const CONCURRENCY = 8;
const RETRIES = 3;
const PREVIEW_WIDTH = 1600;

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const params = new URLSearchParams(location.search);
const pano = {
  panoId: params.get('panoId'),
  source: params.get('source'),
  width: Number(params.get('width')),
  height: Number(params.get('height')),
};
const zoom = Number(params.get('zoom'));
const outWidth = Number(params.get('outWidth')) || null;
const outHeight = Number(params.get('outHeight')) || null;
const quality = Number(params.get('quality')) || 0.92;
const lat = params.get('lat');
const lng = params.get('lng');

/** Cores e rótulos dos marcadores cardeais mostrados sobre o preview. */
const CARDINALS = [
  { label: 'N', key: 'northX', color: '#ff3b30' },
  { label: 'E', key: 'eastX', color: '#34c759' },
  { label: 'S', key: 'southX', color: '#007aff' },
  { label: 'W', key: 'westX', color: '#ffcc00' },
];

function setStatus(text) {
  $('status').textContent = text;
}

async function fetchTile(x, y) {
  let lastError;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    for (const url of tileUrls(pano, x, y, zoom)) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await createImageBitmap(await response.blob());
      } catch (error) {
        lastError = error;
      }
    }
    await sleep(500 * (attempt + 1));
  }
  throw lastError;
}

/** Serializa a orientação no formato do `panorama.json` opcional (ver README). */
function toOrientationJson(orientation) {
  const json = {
    panoId: orientation.panoId,
    location: { lat: orientation.lat, lng: orientation.lng },
    image: { width: orientation.width, height: orientation.height },
  };
  if (orientation.heading !== null) {
    json.orientation = {
      heading: orientation.heading,
      pitch: orientation.pitch,
      roll: orientation.roll,
      northX: orientation.northX,
      eastX: orientation.eastX,
      southX: orientation.southX,
      westX: orientation.westX,
    };
  }
  return json;
}

function buildFilename(width, height) {
  const id = pano.panoId.replace(/[^\w-]/g, '_').slice(0, 40);
  const where = lat !== null ? `_${lat}_${lng}` : '';
  return `streetview_${id}${where}_${width}x${height}.jpg`;
}

/** Reduz o canvas para o tamanho pedido; mantém o original se já for menor ou igual. */
function resize(source, width, height) {
  if (!width || !height || width >= source.width) return source;
  const target = new OffscreenCanvas(width, height);
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  source.width = source.height = 0; // libera a memória do canvas grande
  return target;
}

function download(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

/**
 * Popula a camada sobre o preview com uma linha vertical + rótulo para cada
 * ponto cardeal, posicionados por porcentagem da largura (não em pixels),
 * para acompanhar o preview em qualquer tamanho de tela sem redesenhar nada.
 * Não toca no canvas/JPEG exportado.
 */
function renderCardinalOverlay(orientation) {
  const overlay = $('cardinal-overlay');
  overlay.replaceChildren();
  for (const { label, key, color } of CARDINALS) {
    const leftPct = (orientation[key] / orientation.width) * 100;

    const line = document.createElement('div');
    line.className = 'cardinal-line';
    line.style.left = `${leftPct}%`;
    line.style.background = color;
    overlay.append(line);

    const tag = document.createElement('span');
    tag.className = 'cardinal-label';
    tag.style.left = `${leftPct}%`;
    tag.style.background = color;
    tag.textContent = label;
    overlay.append(tag);
  }
}

async function main() {
  const level = zoomLevels(pano.width, pano.height).find((l) => l.zoom === zoom);
  if (!pano.panoId || !level) throw new Error('Parâmetros inválidos.');

  // Busca a orientação real em paralelo ao download dos tiles; nunca lança erro.
  const orientationPromise = fetchPanoOrientation(pano.panoId);

  $('pano-id').textContent = pano.panoId;
  $('resolution').textContent =
    outWidth && outWidth < level.width ? `${outWidth}×${outHeight}` : `${level.width}×${level.height}`;

  const canvas = new OffscreenCanvas(level.width, level.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, level.width, level.height);

  const jobs = [];
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) jobs.push({ x, y });
  }
  const total = jobs.length;
  let done = 0;
  let failed = 0;

  const progress = $('progress');
  progress.max = total;

  async function worker() {
    while (jobs.length) {
      const { x, y } = jobs.shift();
      try {
        const bitmap = await fetchTile(x, y);
        // Perto dos polos o servidor devolve tiles de menor resolução (ex.: 256×256)
        // que cobrem a célula inteira; por isso cada tile é esticado para TILE_SIZE.
        ctx.drawImage(bitmap, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        bitmap.close();
      } catch (error) {
        failed++;
        console.warn(`Tile ${x},${y} falhou:`, error);
      }
      done++;
      progress.value = done;
      setStatus(`Baixando tiles: ${done}/${total}${failed ? ` (${failed} falharam)` : ''}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failed === total) {
    throw new Error('Nenhum tile pôde ser baixado. A panorâmica pode ser privada ou o formato mudou.');
  }

  let output = canvas;
  if (outWidth && outWidth < level.width) {
    setStatus(`Redimensionando para ${outWidth}×${outHeight}…`);
    output = resize(canvas, outWidth, outHeight);
  }
  const { width, height } = output;

  const meta = await orientationPromise;
  const orientation = buildOrientation({
    panoId: pano.panoId,
    lat: meta?.lat ?? (lat !== null ? Number(lat) : null),
    lng: meta?.lng ?? (lng !== null ? Number(lng) : null),
    heading: meta?.heading ?? null,
    pitch: meta?.pitch ?? null,
    roll: meta?.roll ?? null,
    width,
    height,
  });

  setStatus('Gerando JPEG…');
  const jpeg = await output.convertToBlob({ type: 'image/jpeg', quality });
  const blob = await injectGPano(jpeg, width, height, orientation);

  const preview = $('preview');
  preview.width = Math.min(PREVIEW_WIDTH, width);
  preview.height = Math.round((preview.width * height) / width);
  preview.getContext('2d').drawImage(output, 0, 0, preview.width, preview.height);
  output.width = output.height = 0; // libera a memória do canvas

  if (orientation.heading !== null) {
    renderCardinalOverlay(orientation);
    const toggle = $('toggle-cardinals');
    toggle.addEventListener('change', () => {
      $('cardinal-overlay').hidden = !toggle.checked;
    });
    $('toggle-cardinals-row').hidden = false;
  }

  const url = URL.createObjectURL(blob);
  const filename = buildFilename(width, height);
  download(url, filename);
  $('download').addEventListener('click', () => download(url, filename));

  if (orientation.lat !== null || orientation.heading !== null) {
    const jsonBlob = new Blob([JSON.stringify(toOrientationJson(orientation), null, 2)], {
      type: 'application/json',
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonFilename = buildFilename(width, height).replace(/\.jpg$/, '.json');
    $('download-json').hidden = false;
    $('download-json').addEventListener('click', () => download(jsonUrl, jsonFilename));
  }

  const orientationEl = $('orientation');
  if (orientation.heading !== null) {
    orientationEl.textContent =
      `📍 ${orientation.lat?.toFixed(6)}, ${orientation.lng?.toFixed(6)} · ` +
      `🧭 Heading: ${orientation.heading.toFixed(2)}° · Norte: x=${orientation.northX}`;
    orientationEl.hidden = false;
  } else if (orientation.lat !== null) {
    orientationEl.textContent = `📍 ${orientation.lat.toFixed(6)}, ${orientation.lng.toFixed(6)} · orientação indisponível`;
    orientationEl.hidden = false;
  }

  const sizeMb = (blob.size / 1024 / 1024).toFixed(1);
  const warning = failed ? ` Atenção: ${failed} tiles falharam e ficaram pretos.` : '';
  setStatus(`Pronto: ${filename} (${sizeMb} MB).${warning}`);
  document.title = 'Panorâmica extraída';
  $('result').hidden = false;
}

main().catch((error) => {
  console.error(error);
  setStatus(`Erro: ${error.message}`);
  document.title = 'Erro na extração';
});

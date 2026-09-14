import { TILE_SIZE, tileUrls, zoomLevels } from './lib/pano.js';
import { injectGPano } from './lib/xmp.js';

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

async function main() {
  const level = zoomLevels(pano.width, pano.height).find((l) => l.zoom === zoom);
  if (!pano.panoId || !level) throw new Error('Parâmetros inválidos.');

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

  setStatus('Gerando JPEG…');
  const jpeg = await output.convertToBlob({ type: 'image/jpeg', quality });
  const blob = await injectGPano(jpeg, width, height);

  const preview = $('preview');
  preview.width = Math.min(PREVIEW_WIDTH, width);
  preview.height = Math.round((preview.width * height) / width);
  preview.getContext('2d').drawImage(output, 0, 0, preview.width, preview.height);
  output.width = output.height = 0; // libera a memória do canvas

  const url = URL.createObjectURL(blob);
  const filename = buildFilename(width, height);
  download(url, filename);
  $('download').addEventListener('click', () => download(url, filename));

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

import { DEFAULT_HEIGHT, DEFAULT_WIDTH, parseStreetViewUrl, resolutionOptions } from './lib/pano.js';

const $ = (id) => document.getElementById(id);

function readSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // preferências são opcionais
  }
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pano = tab?.url ? parseStreetViewUrl(tab.url) : null;

  if (!pano) {
    $('not-found').hidden = false;
    return;
  }

  $('form').hidden = false;
  $('pano-id').textContent = pano.panoId;
  if (!pano.width) {
    $('dims-note').hidden = false;
    pano.width = DEFAULT_WIDTH;
    pano.height = DEFAULT_HEIGHT;
  }

  const options = resolutionOptions(pano.width, pano.height);
  options.forEach((res, index) => {
    const option = document.createElement('option');
    const megapixels = ((res.width * res.height) / 1e6).toFixed(1);
    option.value = index;
    option.textContent = `${res.label ? `${res.label} — ` : ''}${res.width}×${res.height} (${megapixels} MP)`;
    $('resolution').append(option);
  });

  const savedWidth = Number(readSetting('width'));
  const savedIndex = options.findIndex((res) => res.width === savedWidth);
  $('resolution').value = savedIndex >= 0 ? savedIndex : 0;
  const savedQuality = readSetting('quality');
  if (savedQuality) $('quality').value = savedQuality;
  $('quality-value').textContent = $('quality').value;

  const selected = () => options[$('resolution').value];
  const updateHint = () => {
    const res = selected();
    $('resolution-hint').textContent = res.native
      ? `Resolução nativa: ${res.tiles} tiles, sem redimensionamento.`
      : `Baixa ${res.tiles} tiles e reduz para ${res.width}×${res.height}.`;
  };
  $('resolution').addEventListener('change', updateHint);
  updateHint();

  $('quality').addEventListener('input', () => {
    $('quality-value').textContent = $('quality').value;
  });

  $('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const res = selected();
    writeSetting('width', res.width);
    writeSetting('quality', $('quality').value);
    const params = new URLSearchParams({
      panoId: pano.panoId,
      source: pano.source,
      width: pano.width,
      height: pano.height,
      zoom: res.zoom,
      outWidth: res.width,
      outHeight: res.height,
      quality: $('quality').value / 100,
    });
    if (pano.lat !== null) {
      params.set('lat', pano.lat);
      params.set('lng', pano.lng);
    }
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`extractor.html?${params}`),
      index: tab.index + 1,
    });
    window.close();
  });
}

main();

export const TILE_SIZE = 512;
export const DEFAULT_WIDTH = 16384;
export const DEFAULT_HEIGHT = 8192;

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Extrai os dados da panorâmica de uma URL do Google Maps no modo Street View, ex.:
 * https://www.google.com/maps/@-23.55,-46.63,3a,75y,90h,90t/data=!3m6!1e1!3m4!1s<PANO_ID>!2e0!7i16384!8i8192
 */
export function parseStreetViewUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(url.hostname)) return null;

  let panoId = null;
  let type = 0;
  const match = rawUrl.match(/!1s([^!/?&#]+)!2e(\d+)/);
  if (match) {
    panoId = safeDecode(match[1]);
    type = Number(match[2]);
  } else {
    panoId = url.searchParams.get('pano') || url.searchParams.get('panoid');
  }
  if (!panoId) return null;

  const dims = rawUrl.match(/!7i(\d+)!8i(\d+)/);
  const coords = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  return {
    panoId,
    source: type === 10 || /^(AF1Qip|CIHM0og|CAoS)/.test(panoId) ? 'photosphere' : 'google',
    width: dims ? Number(dims[1]) : null,
    height: dims ? Number(dims[2]) : null,
    lat: coords ? Number(coords[1]) : null,
    lng: coords ? Number(coords[2]) : null,
  };
}

/** Lista os níveis de zoom disponíveis com resolução e quantidade de tiles de cada um. */
export function zoomLevels(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  const maxZoom = Math.max(0, Math.ceil(Math.log2(width / TILE_SIZE)));
  const levels = [];
  for (let zoom = 0; zoom <= maxZoom; zoom++) {
    const scale = 2 ** (maxZoom - zoom);
    const w = Math.ceil(width / scale);
    const h = Math.ceil(height / scale);
    levels.push({
      zoom,
      width: w,
      height: h,
      cols: Math.ceil(w / TILE_SIZE),
      rows: Math.ceil(h / TILE_SIZE),
    });
  }
  return levels;
}

const PRESETS = [
  { label: '8K', width: 7680 },
  { label: '5.7K', width: 5760 },
  { label: '4K', width: 3840 },
  { label: '2K', width: 2048 },
];

/**
 * Opções de resolução para o usuário: os níveis nativos do servidor mais
 * resoluções comuns, geradas reduzindo o menor nível nativo que as cobre.
 */
export function resolutionOptions(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  const levels = zoomLevels(width, height).filter((l) => l.zoom >= 1);
  const options = levels.map((l) => ({
    label: null,
    width: l.width,
    height: l.height,
    zoom: l.zoom,
    tiles: l.cols * l.rows,
    native: true,
  }));

  for (const preset of PRESETS) {
    const same = options.find((o) => o.width === preset.width);
    if (same) same.label = preset.label;
    if (same || preset.width >= width) continue;
    const level = levels.find((l) => l.width >= preset.width);
    options.push({
      label: preset.label,
      width: preset.width,
      height: Math.round((preset.width * height) / width),
      zoom: level.zoom,
      tiles: level.cols * level.rows,
      native: false,
    });
  }

  options.sort((a, b) => b.width - a.width);
  options[0].label = 'Máxima';
  return options;
}

/** URLs candidatas para um tile, em ordem de preferência. */
export function tileUrls(pano, x, y, zoom) {
  if (pano.source === 'photosphere') {
    return [`https://lh3.ggpht.com/p/${pano.panoId}=x${x}-y${y}-z${zoom}`];
  }
  const id = encodeURIComponent(pano.panoId);
  return [
    `https://streetviewpixels-pa.googleapis.com/v1/tile?cb_client=maps_sv.tactile&panoid=${id}&x=${x}&y=${y}&zoom=${zoom}&nbt=1&fover=2`,
    `https://cbk0.google.com/cbk?output=tile&panoid=${id}&zoom=${zoom}&x=${x}&y=${y}`,
  ];
}

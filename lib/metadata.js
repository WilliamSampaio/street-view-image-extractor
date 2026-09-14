import { normalizeBearing } from './orientation.js';

// Endpoint interno (não documentado) usado pelo próprio Google Maps para obter
// metadados de uma panorâmica a partir do panoId. Formato descoberto por
// engenharia reversa e validado empiricamente (ver README); pode mudar sem
// aviso, por isso toda falha aqui é tratada de forma silenciosa e degrada
// para "orientação indisponível" em vez de quebrar a extração.
const METADATA_URL = 'https://www.google.com/maps/photometa/v1';
const METADATA_PB =
  '!1m4!1smaps_sv.tactile!11m2!2m1!1b1!2m2!1sen!2sus!3m3!1m2!1e2!2s{PANOID}' +
  '!4m57!1e1!1e2!1e3!1e4!1e5!1e6!1e8!1e12!2m1!1e1!4m1!1i48!5m1!1e1!5m1!1e2!6m1!1e1!6m1!1e2' +
  '!9m36!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3' +
  '!1m3!1e1!2b0!3e3!1m3!1e4!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e3';

/**
 * Busca heading/pitch/roll/lat/lng reais da panorâmica no endpoint interno
 * do Google (distinto do heading de visualização `h=` da URL do Maps e do
 * heading de panoramas vizinhos em `links[]`). Retorna `null` em qualquer
 * falha (rede, formato de resposta mudou, panoId inválido etc.).
 */
export async function fetchPanoOrientation(panoId) {
  try {
    const pb = METADATA_PB.replace('{PANOID}', encodeURIComponent(panoId));
    const url = `${METADATA_URL}?authuser=0&hl=en&gl=us&pb=${pb}`;
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) return null;

    const text = await response.text();
    const data = JSON.parse(text.replace(/^\)\]\}'\n?/, ''));
    const info = data?.[1]?.[0]?.[5]?.[0]?.[1];
    const [, , lat, lng] = info?.[0] ?? [];
    const [heading, pitchRaw, rollRaw] = info?.[2] ?? [];
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof heading !== 'number') return null;

    return {
      lat,
      lng,
      heading: normalizeBearing(heading),
      pitch: typeof pitchRaw === 'number' ? 90 - pitchRaw : null,
      roll: typeof rollRaw === 'number' ? ((rollRaw + 180) % 360 + 360) % 360 - 180 : null,
    };
  } catch {
    return null;
  }
}

/**
 * Matemática de orientação geográfica da equiretangular.
 *
 * Convenção comprovada empiricamente (ver README): o `heading` do panorama
 * (heading/pitch/roll obtidos em lib/metadata.js) é o azimute, em graus e no
 * sentido horário a partir do Norte, do pixel central (x = width / 2) da
 * imagem equiretangular. x crescente = azimute crescente (sentido horário).
 * Isso é exatamente a definição oficial de GPano:PoseHeadingDegrees.
 */

/** Normaliza um ângulo para o intervalo [0, 360). */
export function normalizeBearing(bearing) {
  const b = bearing % 360;
  return b < 0 ? b + 360 : b;
}

/** Normaliza uma coordenada horizontal para o intervalo [0, width), tratando o wrap-around. */
export function normalizePixelX(x, width) {
  const px = x % width;
  return px < 0 ? px + width : px;
}

/** Bearing geodésico inicial (graus, 0-360) do ponto 1 até o ponto 2. */
export function bearingBetweenCoordinates(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return normalizeBearing(toDeg(Math.atan2(y, x)));
}

/** Coordenada horizontal (px) onde um azimute aparece na equiretangular. */
export function bearingToPixelX(bearing, heading, width) {
  return normalizePixelX(((bearing - heading) / 360) * width + width / 2, width);
}

/** Azimute (graus) correspondente a uma coordenada horizontal da equiretangular. */
export function pixelXToBearing(x, heading, width) {
  return normalizeBearing(((normalizePixelX(x, width) - width / 2) / width) * 360 + heading);
}

/** Coordenada horizontal (px) do norte verdadeiro (0°). */
export function getNorthPixelX(heading, width) {
  return bearingToPixelX(0, heading, width);
}

/**
 * Monta a estrutura de orientação da panorâmica para uma imagem já exportada
 * (largura/altura finais, após eventual redimensionamento). Retorna `null`
 * nos campos dependentes de heading quando ele não está disponível.
 */
export function buildOrientation({ panoId, lat, lng, heading, pitch, roll, width, height }) {
  const hasHeading = typeof heading === 'number' && Number.isFinite(heading);
  const cardinal = (bearing) => (hasHeading ? Math.round(bearingToPixelX(bearing, heading, width)) : null);
  return {
    panoId,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
    heading: hasHeading ? heading : null,
    pitch: typeof pitch === 'number' ? pitch : null,
    roll: typeof roll === 'number' ? roll : null,
    width,
    height,
    northX: cardinal(0),
    eastX: cardinal(90),
    southX: cardinal(180),
    westX: cardinal(270),
  };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBearing,
  normalizePixelX,
  bearingBetweenCoordinates,
  bearingToPixelX,
  pixelXToBearing,
  getNorthPixelX,
} from '../lib/orientation.js';

test('normalizeBearing mantém valores já no intervalo [0, 360)', () => {
  assert.equal(normalizeBearing(0), 0);
  assert.equal(normalizeBearing(90), 90);
  assert.equal(normalizeBearing(180), 180);
  assert.equal(normalizeBearing(270), 270);
  assert.equal(normalizeBearing(359), 359);
});

test('normalizeBearing trata wrap-around e valores fora do intervalo', () => {
  assert.equal(normalizeBearing(360), 0);
  assert.equal(normalizeBearing(-1), 359);
  assert.equal(normalizeBearing(720), 0);
  assert.equal(normalizeBearing(-361), 359);
  assert.equal(normalizeBearing(730), 10);
});

test('normalizePixelX trata wrap-around da largura da imagem', () => {
  const width = 16384;
  assert.equal(normalizePixelX(0, width), 0);
  assert.equal(normalizePixelX(width, width), 0);
  assert.equal(normalizePixelX(-1, width), width - 1);
  assert.equal(normalizePixelX(width + 5, width), 5);
});

test('bearingToPixelX: heading fica sempre no centro da imagem (definição GPano)', () => {
  const width = 16384;
  for (const heading of [0, 45, 123.456, 270, 359.9]) {
    assert.equal(Math.round(bearingToPixelX(heading, heading, width)), width / 2);
  }
});

test('bearingToPixelX / getNorthPixelX: casos concretos com heading conhecido', () => {
  const width = 16384;
  // heading = 0 → norte já está no centro da imagem.
  assert.equal(Math.round(bearingToPixelX(0, 0, width)), width / 2);
  // heading = 90 (câmera olhando para o leste) → norte fica um quarto de volta
  // para trás, ou seja, à esquerda do centro.
  assert.equal(Math.round(bearingToPixelX(0, 90, width)), width / 4);
  assert.equal(Math.round(getNorthPixelX(90, width)), width / 4);
  // heading = 270 → norte fica um quarto de volta à frente, à direita do centro.
  assert.equal(Math.round(getNorthPixelX(270, width)), (3 * width) / 4);
});

test('pixelXToBearing / bearingToPixelX são inversas (roundtrip)', () => {
  const width = 16384;
  const pxError = 360 / width; // erro tolerado: um pixel, em graus
  for (const heading of [0, 37.5, 90, 180, 270, 359.9]) {
    for (const bearing of [0, 1, 45, 90, 135, 180, 225, 270, 315, 359]) {
      const x = bearingToPixelX(bearing, heading, width);
      const roundtrip = pixelXToBearing(x, heading, width);
      const diff = Math.min(Math.abs(roundtrip - bearing), 360 - Math.abs(roundtrip - bearing));
      assert.ok(diff <= pxError, `heading=${heading} bearing=${bearing} => roundtrip=${roundtrip}`);
    }
  }
});

test('pixelXToBearing / bearingToPixelX: wrap-around 359° → 0° não quebra', () => {
  const width = 16384;
  const heading = 10;
  const xNear360 = bearingToPixelX(359.5, heading, width);
  const xNear0 = bearingToPixelX(0.5, heading, width);
  // 359.5° e 0.5° estão a 1° de distância cruzando o wrap; os pixels também devem
  // estar próximos (considerando o wrap da própria largura da imagem).
  const pixelGap = Math.min(Math.abs(xNear360 - xNear0), width - Math.abs(xNear360 - xNear0));
  assert.ok(pixelGap <= (2 * width) / 360 + 1);
});

test('bearingBetweenCoordinates: casos cardeais simples', () => {
  // Deslocamentos pequenos e alinhados a um eixo para evitar efeitos de longa distância.
  assert.ok(Math.abs(bearingBetweenCoordinates(0, 0, 1, 0) - 0) < 0.01); // norte
  assert.ok(Math.abs(bearingBetweenCoordinates(0, 0, 0, 1) - 90) < 0.01); // leste
  assert.ok(Math.abs(bearingBetweenCoordinates(0, 0, -1, 0) - 180) < 0.01); // sul
  assert.ok(Math.abs(bearingBetweenCoordinates(0, 0, 0, -1) - 270) < 0.01); // oeste
});

test('bearingBetweenCoordinates: caso real validado (Paris, rua próxima ao Rond-Point)', () => {
  // Valores obtidos e validados em 2026-09-13 contra o heading real da panorâmica
  // (ver README) — bearing geodésico calculado aqui deve ficar muito próximo do
  // heading reportado pelo Google (298.7423706054688°) para essa panorâmica.
  const pano = [48.86975005797848, 2.30791261262089];
  const neighbor = [48.86981154251602, 2.307742551699586];
  const bearing = bearingBetweenCoordinates(pano[0], pano[1], neighbor[0], neighbor[1]);
  assert.ok(Math.abs(bearing - 298.7423706054688) < 0.2, `bearing calculado: ${bearing}`);
});

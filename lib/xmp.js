/**
 * Insere metadados XMP GPano no JPEG para que visualizadores 360°
 * (Google Photos, Facebook, etc.) reconheçam a imagem como panorâmica.
 */
export async function injectGPano(jpegBlob, width, height) {
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return jpegBlob;

  // Insere logo após o SOI, ou após o segmento APP0 (JFIF) se existir.
  let insertAt = 2;
  if (bytes[2] === 0xff && bytes[3] === 0xe0) {
    insertAt = 4 + ((bytes[4] << 8) | bytes[5]);
  }

  const xmp =
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">' +
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"' +
    ' GPano:ProjectionType="equirectangular"' +
    ' GPano:UsePanoramaViewer="True"' +
    ` GPano:FullPanoWidthPixels="${width}"` +
    ` GPano:FullPanoHeightPixels="${height}"` +
    ` GPano:CroppedAreaImageWidthPixels="${width}"` +
    ` GPano:CroppedAreaImageHeightPixels="${height}"` +
    ' GPano:CroppedAreaLeftPixels="0"' +
    ' GPano:CroppedAreaTopPixels="0"/>' +
    '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

  const encoder = new TextEncoder();
  const header = encoder.encode('http://ns.adobe.com/xap/1.0/\0');
  const packet = encoder.encode(xmp);
  const segmentLength = 2 + header.length + packet.length;

  const segment = new Uint8Array(2 + segmentLength);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment[2] = segmentLength >> 8;
  segment[3] = segmentLength & 0xff;
  segment.set(header, 4);
  segment.set(packet, 4 + header.length);

  return new Blob([bytes.subarray(0, insertAt), segment, bytes.subarray(insertAt)], {
    type: 'image/jpeg',
  });
}

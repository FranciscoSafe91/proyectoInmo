// multipart.js — parser propio de "multipart/form-data" (para subir archivos)
// sin ninguna dependencia externa (no usa multer ni busboy).
//
// Importante: trabaja siempre con Buffers, nunca con strings, para no
// corromper los bytes de un archivo binario (una imagen, por ejemplo).

export function isMultipart(req) {
  const contentType = req.headers['content-type'] || '';
  return contentType.startsWith('multipart/form-data');
}

function getBoundary(req) {
  const contentType = req.headers['content-type'] || '';
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  return match[1] || match[2];
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new Error('Archivo demasiado grande.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseHeaders(headerBuffer) {
  // Los headers de cada parte son siempre ASCII, así que decodificarlos como
  // texto es seguro (el contenido binario viene después, aparte).
  const text = headerBuffer.toString('utf-8');
  const headers = {};
  text.split('\r\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  });
  return headers;
}

// Devuelve { fields: {name: value}, files: {name: {filename, contentType, buffer}} }
export async function parseMultipartFormData(req, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const boundary = getBoundary(req);
  if (!boundary) throw new Error('No se encontró el boundary de multipart/form-data.');

  const body = await readRawBody(req, maxBytes);
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  const fields = {};
  const files = {};

  // Encuentra cada segmento entre boundaries.
  let start = body.indexOf(boundaryBuffer, 0);
  while (start !== -1) {
    const nextStart = body.indexOf(boundaryBuffer, start + boundaryBuffer.length);
    if (nextStart === -1) break;

    // El contenido de esta parte va desde justo después del boundary (+ \r\n)
    // hasta justo antes del \r\n que precede al próximo boundary.
    let partStart = start + boundaryBuffer.length;
    if (body[partStart] === 0x2d && body[partStart + 1] === 0x2d) break; // "--" = boundary final
    if (body[partStart] === 0x0d && body[partStart + 1] === 0x0a) partStart += 2;

    let partEnd = nextStart;
    if (body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) partEnd -= 2;

    const part = body.subarray(partStart, partEnd);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headers = parseHeaders(part.subarray(0, headerEnd));
      const content = part.subarray(headerEnd + 4);
      const disposition = headers['content-disposition'] || '';
      const nameMatch = disposition.match(/name="([^"]*)"/);
      const filenameMatch = disposition.match(/filename="([^"]*)"/);
      const name = nameMatch ? nameMatch[1] : null;

      if (name) {
        if (filenameMatch && filenameMatch[1]) {
          files[name] = {
            filename: filenameMatch[1],
            contentType: headers['content-type'] || 'application/octet-stream',
            buffer: Buffer.from(content), // copia propia, independiente del buffer original
          };
        } else {
          fields[name] = content.toString('utf-8');
        }
      }
    }

    start = nextStart;
  }

  return { fields, files };
}

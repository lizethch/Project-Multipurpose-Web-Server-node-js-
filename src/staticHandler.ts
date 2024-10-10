import fs from 'fs';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FOUR_MB = 4 * 1024 * 1024;

export function handleStaticRequest(req: IncomingMessage, res: ServerResponse) {
  let filePath = path.join(PUBLIC_DIR, req.url || '');
  
  if (filePath.includes('error')) {
    sendServerError(res, "Intentional Server Error");
  }

// Verificamos la ruta del directorio
fs.stat(filePath, (err, stats) => {
  if (err) {
    return sendNotFound(res);
  }

  if (stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  if (stats.isFile()) {
    if (stats.size > FOUR_MB) {
      return streamLargeFile(filePath, req, res);
    } else {
      return sendSmallFile(filePath, res);
    }
  } else {
    return sendNotFound(res);
  }
});
}

function sendNotFound(res: ServerResponse) {
  if (!res.headersSent) {
    const notFoundPath = path.join(PUBLIC_DIR, '404.html');
    fs.readFile(notFoundPath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else {
    console.error('Attempted to send 404, but headers already sent');
  }
}

function sendServerError(res: ServerResponse, message: string) {
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  } else {
    console.error('Attempted to send server error, but headers already sent');
  }
}

// Obtiene el tipo de archivo segun el filePath (ruta del archivo) indicado
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: {[key: string]: string} = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf' :'application/pdf',
    '.txt':'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Metodo que optimiza envio para archivos mayores de 4MB
// Optional: Si como parte del header tiene el valor "range", toma este valor y responde las peticiones pedazo por pedazo (chunk)
function streamLargeFile(filePath: string, req: IncomingMessage, res: ServerResponse) {
  const stat= fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/,"").split("-");
    const start = parseInt(parts[0],10);
    const end = parts[1]? parseInt(parts[1],10): fileSize -1;
    const chunksize = (end -start)+1;
    const file = fs.createReadStream(filePath,{start,end});
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': getContentType(filePath),
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': getContentType(filePath),
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

// Metodo que sirve para enviar  archivos menores o iguales a 4MB
function sendSmallFile(filePath: string, res: ServerResponse) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendServerError(res, err.message);
    } else {
      const contentType = getContentType(filePath);

      // Declaramos explícitamente que headers es un objeto con claves string y valores string o number
      const headers: { [key: string]: string | number } = {
        'Content-Type': contentType,
        'Content-Length': content.length.toString(),
      };

      if (!['.html', '.css', '.js'].includes(path.extname(filePath).toLowerCase())) {
        headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
      }

      res.writeHead(200, headers);
      res.end(content);
    }
  });
}

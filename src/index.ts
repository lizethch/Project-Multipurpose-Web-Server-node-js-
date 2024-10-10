import http from 'http';
import { handleStaticRequest } from './staticHandler';

// Crea un servidor para atender la petición del lado del cliente, evaluando el tipo de metodo usado ("GET" en este caso)
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    handleStaticRequest(req, res);
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});

import './apiHandler'


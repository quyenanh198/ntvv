// Stub Chat auth server for local farm dev: any cookie => logged-in family.
const http = require('http');
const FAMILY = [
  { id: 1, username: 'nongdan', display_name: 'Nông Dân Nhí' },
  { id: 2, username: 'me', display_name: 'Mẹ Bắp' },
  { id: 3, username: 'bo', display_name: 'Bố Cà Rốt' },
];
http.createServer((req, res) => {
  if (req.url === '/api/me') {
    if (!req.headers.cookie) { res.writeHead(401); return res.end('{}'); }
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(FAMILY[0]));
  }
  res.writeHead(404); res.end('{}');
}).listen(8082, () => console.log('chat stub on :8082'));

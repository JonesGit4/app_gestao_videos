// API proxy para Edição de Vídeo — NocoDB
// Roda em Node.js sem dependências externas
const http = require('http');
const https = require('https');

const TOKEN = 'nc_pat_1aOj3QbDFESJWURvzf83z8vRBfALrPWOOWxuafUP';
const BASE = 'pwwh41b14mmh5fz';
const TABLES = {
  clientes: 'mj2xj6r21qbczrx',
  entregas: 'mw6oduhl8jyjx7l',
};
const LINK_FIELD = 'c5c1bhqm8nat340'; // campo Cliente na tabela Entregas
const NOCOSB = 'app.nocodb.com';

function nocodb(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: NOCOSB,
      path,
      method,
      headers: {
        'xc-token': TOKEN,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function jsonReply(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  try {
    // GET /api/clientes
    if (req.method === 'GET' && path === '/api/clientes') {
      const r = await nocodb('GET', `/api/v2/tables/${TABLES.clientes}/records?limit=50`);
      if (r.status !== 200) throw new Error('Erro NocoDB');
      jsonReply(res, 200, r.body);
      return;
    }

    // GET /api/dashboard
    if (req.method === 'GET' && path === '/api/dashboard') {
      const r = await nocodb('GET', `/api/v2/tables/${TABLES.clientes}/records?limit=50`);
      if (r.status !== 200) throw new Error('Erro NocoDB');
      jsonReply(res, 200, r.body);
      return;
    }

    // POST /api/entregas
    if (req.method === 'POST' && path === '/api/entregas') {
      const body = await readBody(req);
      const { cliente, data, quantidade, mes } = JSON.parse(body);

      if (!cliente || !data || !quantidade) {
        jsonReply(res, 400, { error: 'Campos obrigatórios: cliente, data, quantidade' });
        return;
      }

      // Passo 1: criar a entrega
      const create = await nocodb('POST', `/api/v2/tables/${TABLES.entregas}/records`, {
        Data: data,
        Quantidade: parseInt(quantidade),
        'Mês Referência': mes || data.substring(0, 7),
      });

      if (create.status !== 201 && create.status !== 200) {
        jsonReply(res, 500, { error: 'Erro ao criar entrega' });
        return;
      }

      const entregaId = create.body.Id;

      // Passo 2: vincular ao cliente
      const link = await nocodb(
        'POST',
        `/api/v2/tables/${TABLES.entregas}/links/${LINK_FIELD}/records/${entregaId}`,
        [{ Id: parseInt(cliente) }]
      );

      if (link.status < 200 || link.status >= 300) {
        jsonReply(res, 500, { error: 'Entrega criada mas falha ao vincular cliente', detail: link.status });
        return;
      }

      jsonReply(res, 201, { Id: entregaId, ok: true });
      return;
    }

    // POST /api/clientes
    if (req.method === 'POST' && path === '/api/clientes') {
      const body = await readBody(req);
      const { nome, contrato, diaria, semanal, mensal } = JSON.parse(body);

      if (!nome) {
        jsonReply(res, 400, { error: 'Nome é obrigatório' });
        return;
      }

      const r = await nocodb('POST', `/api/v2/tables/${TABLES.clientes}/records`, {
        Nome: nome,
        'Possui Contrato': !!contrato,
        'Meta Diária': parseInt(diaria) || 0,
        'Meta Semanal': parseInt(semanal) || 0,
        'Meta Mensal': parseInt(mensal) || 0,
      });

      if (r.status < 200 || r.status >= 300) {
        jsonReply(res, 500, { error: 'Erro ao cadastrar cliente' });
        return;
      }

      jsonReply(res, 201, r.body);
      return;
    }

    // 404
    jsonReply(res, 404, { error: 'Rota não encontrada' });
  } catch (e) {
    jsonReply(res, 500, { error: e.message });
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(handleRequest);
server.listen(3099, '127.0.0.1', () => {
  console.log('API proxy rodando em http://127.0.0.1:3099');
});

# 🎬 App Gestão de Vídeos

App para o Artur lançar e acompanhar produção diária de vídeos por cliente.

**Stack:** HTML estático + Node.js API proxy + NocoDB (backend)

## Arquitetura

```
[design.duobro.com.br]
       │
       ├─ /dashboard/*          → arquivos estáticos (nginx)
       │   ├─ lancar.html        formulário de lançamento
       │   ├─ app.html           app completo (lançar + cadastrar)
       │   └─ edicao-video.html  dashboard com gauges
       │
       └─ /api/*                → proxy Node.js (127.0.0.1:3099)
              │                    token NocoDB fica só aqui
              └─ app.nocodb.com    NocoDB API
```

### Por que o proxy?

A API do NocoDB não permite criar registros com campo Link diretamente — o vínculo entre Entrega e Cliente exige 2 chamadas (POST entrega → POST link). O proxy Node.js encapsula essa lógica e esconde o token.

## NocoDB — Estrutura

**Base:** `Edição de Vídeo - Controle` (workspace pessoal Jones)

### Tabela `Clientes`
| Campo | Tipo |
|-------|------|
| Nome | SingleLineText |
| Possui Contrato | Checkbox |
| Meta Diária | Number |
| Meta Semanal | Number |
| Meta Mensal | Number (0 = sem meta mensal) |
| **Total de Entregas** | Rollup (SUM da Quantidade) |
| **% da Meta** | Formula |
| **Índice** | Formula (1-5) |

### Tabela `Entregas`
| Campo | Tipo |
|-------|------|
| Data | Date |
| Quantidade | Number |
| Mês Referência | SingleLineText (YYYY-MM) |
| Cliente | Link → Clientes |

## Dashboard — Lógica de exibição

- **Meta Mensal > 0** → índice 1-5 contra meta mensal (`📄 Contrato`)
- **Meta Mensal = 0** → % contra meta semanal (`📄 Contrato diário/semanal`)
- **Sem contrato** → sem indicadores (`📝 Avulso`)

Índices: 1 = Muito Abaixo · 3 = No Contrato · 5 = Muito Acima

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Lista clientes (Nome + Id) |
| GET | `/api/dashboard` | Lista clientes com todos os campos |
| POST | `/api/entregas` | Cria entrega + vincula ao cliente |
| POST | `/api/clientes` | Cadastra novo cliente |

### POST /api/entregas
```json
{
  "cliente": 5,
  "data": "2026-05-29",
  "quantidade": 11,
  "mes": "2026-05"
}
```

## Deploy

```bash
# 1. Copiar arquivos
scp dashboard/* root@server:/var/www/design.duobro.com.br/dashboard/
scp api/server.js root@server:/var/www/design.duobro.com.br/api/

# 2. Configurar token
ssh root@server
echo 'NOCODB_TOKEN=nc_pat_...' >> /etc/systemd/system/edicao-api.service.d/env.conf

# 3. Iniciar serviço
systemctl daemon-reload
systemctl enable --now edicao-api

# 4. Nginx (adicionar location /api/ ao server block existente)
nginx -t && systemctl reload nginx
```

## Arquivos

```
.
├── dashboard/
│   ├── lancar.html          # Página simples de lançamento
│   ├── app.html             # App com tabs (lançar + cadastrar cliente)
│   └── edicao-video.html    # Dashboard com gauges visuais
├── api/
│   └── server.js            # Proxy Node.js (zero dependências)
├── nginx/
│   └── design.duobro.com.br.conf
├── systemd/
│   └── edicao-api.service
└── README.md
```

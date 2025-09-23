# 🚀 Deploy no Render - API Urna Eletrônica

Este guia mostra como fazer deploy da API da Urna Eletrônica no Render, seguindo a estrutura da sua API modelo.

## 📋 Pré-requisitos

1. **Conta no Supabase**: [supabase.com](https://supabase.com)
2. **Conta no Render**: [render.com](https://render.com)
3. **Repositório no GitHub**: Fork ou clone este projeto

## 🔧 Configuração do Supabase

1. Acesse seu projeto no Supabase
2. Vá em **Settings** → **API**
3. Anote estas informações:
   - `Project URL` → SUPABASE_URL
   - `anon public` key → SUPABASE_ANON_KEY  
   - `service_role` key → SUPABASE_SERVICE_ROLE_KEY

## 🚀 Deploy no Render

### 1. Criar Web Service

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **New** → **Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `api-urna-eletronica`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18

### 2. Variáveis de Ambiente

No painel do Render, vá em **Environment** e adicione:

```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
JWT_SECRET=sua_chave_secreta_jwt_minimo_32_caracteres_muito_forte
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://sua-aplicacao-frontend.onrender.com,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 3. Deploy

1. Clique em **Create Web Service**
2. Aguarde o build e deploy (3-5 minutos)
3. A API inicializará automaticamente o banco
4. Verifique os logs para confirmar sucesso

## ✅ Verificação

### Health Check
Acesse: `https://sua-app.onrender.com/health`

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T10:00:00.000Z", 
  "uptime": 123.45,
  "environment": "production"
}
```

### Login de Teste
Endpoint: `https://sua-app.onrender.com/api/auth/login`

Credenciais padrão:
```json
{
  "email": "admin@urna.com",
  "senha": "admin123"
}
```

## 📱 Estrutura da API

A API seguindo o padrão da sua aplicação modelo tem:

```
📁 api/
├── index.js              # Aplicação principal
├── config/               # Configurações (Supabase)
├── controllers/          # Controladores organizados por módulo
│   ├── Auth/            # Autenticação
│   ├── Dashboard/       # Painel administrativo  
│   ├── Votacao/         # Sistema de votação
│   └── Gerencia/        # CRUD de entidades
├── middleware/          # Middlewares (auth, validation, etc)
├── routes/              # Rotas centralizadas
└── utils/               # Utilitários (helpers, logger)

📁 utils/
├── initDatabase.js      # Inicialização do banco
└── seedData.js         # Dados de exemplo

📄 index.js             # Entry point
```

## 🎯 Principais Endpoints

```
# Autenticação
POST /api/auth/login
GET  /api/auth/me

# Dashboard
GET  /api/v1/dashboard/summary

# Eleições  
GET  /api/v1/eleicoes
POST /api/v1/eleicoes

# Candidatos
GET  /api/v1/candidatos
POST /api/v1/candidatos

# Votação (Interface da Urna)
POST /api/urna-votacao/validar-eleitor
GET  /api/urna-votacao/candidatos/:eleicaoId
POST /api/urna-votacao/votar

# Documentação
GET  /api/docs
```

## 🔧 Scripts Automáticos

O projeto inclui scripts que executam automaticamente no deploy:

- `render-postbuild`: Executa após o build
- `setup`: Inicializa banco + dados de exemplo
- `init-db`: Cria apenas as tabelas
- `seed`: Insere apenas dados de exemplo

## ⚠️ Importante

1. **JWT_SECRET**: Use uma chave forte com 32+ caracteres
2. **CORS_ORIGIN**: Configure com a URL do seu frontend
3. **Credenciais padrão**: Altere `admin@urna.com` após primeiro login
4. **Cold Start**: No plano gratuito do Render, a primeira requisição pode ser lenta

## 🛠️ Desenvolvimento Local

Para testar localmente antes do deploy:

```bash
# Clone e instale
git clone seu-repositorio
cd api-urna-eletronica
npm install

# Configure ambiente
cp .env.render .env
# Edite as variáveis em .env

# Execute setup
npm run setup

# Desenvolvimento
npm run dev
```

## 📞 Solução de Problemas

1. **Build falha**: Verifique versão do Node.js (18+)
2. **Banco não inicializa**: Confirme variáveis do Supabase
3. **CORS errors**: Ajuste CORS_ORIGIN
4. **500 errors**: Verifique logs no Render

## 🎉 Pronto!

Sua API da Urna Eletrônica está agora executando no Render com:

- ✅ Banco PostgreSQL configurado
- ✅ Dados de exemplo inseridos  
- ✅ Autenticação funcionando
- ✅ WebSocket para tempo real
- ✅ Sistema de votação completo
- ✅ Dashboard administrativo

A API está pronta para integração com frontend e hardware ESP32!
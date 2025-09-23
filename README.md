# API Urna Eletrônica

API REST completa para sistema de urna eletrônica com monitoramento em tempo real, desenvolvida em **Node.js** com **Express** e integração com **Supabase**.

## 🚀 Características

* **API REST Completa**: CRUD para gerenciamento de eleições
* **Autenticação JWT**: Autenticação e autorização seguras
* **Tempo Real**: Atualizações instantâneas via WebSocket (Socket.IO)
* **Integração ESP32**: Comunicação direta com hardware da urna
* **Auditoria Completa**: Log de todas as operações do sistema
* **Upload de Arquivos**: Fotos de candidatos e importação de eleitores
* **Relatórios**: Exportação de resultados em PDF e CSV
* **Banco Relacional**: PostgreSQL via Supabase

## 📋 Pré-requisitos

* Node.js `18.x` ou superior
* Conta no **Supabase**
* ESP32 (opcional, para uso com hardware real)

## ⚙️ Instalação

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd Api_urna
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# JWT
JWT_SECRET=sua_chave_secreta_jwt
JWT_EXPIRES_IN=24h

# ESP32
ESP32_DEFAULT_IP=192.168.1.100
ESP32_TIMEOUT=5000
```

4. **Configure o banco de dados**

```bash
npm run init-db
```

5. **Inicie o servidor**

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📊 Estrutura do Banco de Dados

* **usuarios**: Administradores do sistema
* **eleicoes**: Eleições cadastradas
* **candidatos**: Candidatos por eleição
* **eleitores**: Eleitores habilitados
* **urnas**: Dispositivos de votação
* **votos**: Votos registrados
* **logs\_auditoria**: Registro completo de operações

## 🛣️ Rotas da API

### Autenticação

```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
```

### Dashboard

```
GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/grafico/:id
GET    /api/v1/dashboard/urnas-status
```

### Urnas

```
GET    /api/v1/urnas
GET    /api/v1/urnas/:id
POST   /api/v1/urnas
PUT    /api/v1/urnas/:id
DELETE /api/v1/urnas/:id
POST   /api/v1/urnas/:numero/ping
```

### Eleições

```
GET    /api/v1/eleicoes
GET    /api/v1/eleicoes/:id
POST   /api/v1/eleicoes
PUT    /api/v1/eleicoes/:id
DELETE /api/v1/eleicoes/:id
```

### Candidatos

```
GET    /api/v1/candidatos
GET    /api/v1/candidatos/:id
POST   /api/v1/candidatos
PUT    /api/v1/candidatos/:id
DELETE /api/v1/candidatos/:id
```

### Eleitores

```
GET    /api/v1/eleitores
GET    /api/v1/eleitores/:id
POST   /api/v1/eleitores
PUT    /api/v1/eleitores/:id
DELETE /api/v1/eleitores/:id
POST   /api/v1/eleitores/importar
```

### Resultados

```
GET    /api/v1/resultados/:eleicaoId
GET    /api/v1/resultados/:eleicaoId/exportar
```

### Auditoria

```
GET    /api/v1/auditoria
GET    /api/v1/auditoria/estatisticas
GET    /api/v1/auditoria/:id
```

### Rotas da Urna (Votação)

```
POST   /api/eleitores/validar
GET    /api/candidatos
POST   /api/votos
```

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Tokens)**.

Exemplo de login:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@urna.com", "senha": "admin123"}'
```

Requisição autenticada:

```bash
curl -H "Authorization: Bearer SEU_TOKEN_JWT" \
  http://localhost:3001/api/v1/dashboard/summary
```

## 🏗️ Níveis de Acesso

* **Admin**: Acesso total (CRUD e relatórios)
* **Operador**: Acesso de leitura e operações básicas

## 📡 WebSocket (Tempo Real)

Eventos disponíveis:

* `vote-update`: Novo voto registrado
* `results-update`: Atualização dos resultados
* `urna-status`: Alteração no status da urna
* `system-alert`: Alertas do sistema

## 🤖 Integração ESP32

Configuração no `.env`:

```env
ESP32_DEFAULT_IP=192.168.1.100
```

Exemplo de endpoint:

```
POST http://192.168.1.100/registrar-voto
```

## 📁 Upload de Arquivos

* **Foto de candidatos** (multipart/form-data)
* **Importação de eleitores** (CSV ou Excel)

Formato CSV esperado:

```csv
matricula,nome,cpf,email,telefone
12345678,João Silva,12345678901,joao@email...
```

## 📊 Monitoramento

* **Health Check**: `/health`
* **Logs**:

  * `logs/combined.log` → todos os registros
  * `logs/error.log` → apenas erros

## 🔒 Segurança

* **Rate Limiting**: 100 requisições/15min
* **Helmet**: Headers de segurança
* **CORS restritivo**
* **Validação com Joi**
* **Auditoria completa**

## 🐛 Tratamento de Erros

Formato padrão:

```json
{
  "status": "erro",
  "message": "Descrição do erro",
  "details": ["Detalhes adicionais"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 Deploy

### PM2

```bash
pm2 start src/server.js --name "api-urna"
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testes

```bash
npm test
npm run test:coverage
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit (`git commit -m 'Adiciona NovaFeature'`)
4. Push (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE).

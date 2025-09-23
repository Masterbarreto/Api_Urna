# API Urna Eletrônica

API REST completa para sistema de urna eletrônica com monitoramento em tempo real, desenvolvida em Node.js com Express e integração com Supabase.

## 🚀 Características

- **API REST Completa**: Todas as operações CRUD para gerenciamento de eleições
- **Autenticação JWT**: Sistema seguro de autenticação e autorização
- **Tempo Real**: WebSocket com Socket.IO para atualizações instantâneas
- **Integração ESP32**: Comunicação direta com hardware da urna
- **Auditoria Completa**: Log de todas as operações do sistema
- **Upload de Arquivos**: Suporte para fotos de candidatos e importação de eleitores
- **Relatórios**: Exportação de resultados em PDF e CSV
- **Banco Relacional**: PostgreSQL via Supabase

## 📋 Pré-requisitos

- Node.js 18.0.0 ou superior
- Conta no Supabase
- ESP32 (opcional, para hardware da urna)

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

Edite o arquivo `.env` com suas configurações:
```env
# Configuração do Servidor
PORT=3001
NODE_ENV=development

# Configuração do Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# Configuração JWT
JWT_SECRET=sua_chave_secreta_jwt
JWT_EXPIRES_IN=24h

# Configuração do ESP32
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

### Tabelas Principais

- **usuarios**: Administradores do sistema
- **eleicoes**: Eleições cadastradas
- **candidatos**: Candidatos por eleição
- **eleitores**: Eleitores habilitados
- **urnas**: Dispositivos de votação
- **votos**: Votos registrados
- **logs_auditoria**: Logs de todas as operações

## 🛣️ Rotas da API

### Autenticação
```
POST   /api/v1/auth/login          # Login do usuário
GET    /api/v1/auth/me             # Dados do usuário logado
POST   /api/v1/auth/logout         # Logout
POST   /api/v1/auth/refresh        # Renovar token
```

### Dashboard
```
GET    /api/v1/dashboard/summary           # Estatísticas gerais
GET    /api/v1/dashboard/grafico/:id       # Dados do gráfico
GET    /api/v1/dashboard/urnas-status      # Status das urnas
```

### Urnas
```
GET    /api/v1/urnas              # Listar urnas
GET    /api/v1/urnas/:id          # Obter urna específica
POST   /api/v1/urnas              # Criar urna
PUT    /api/v1/urnas/:id          # Atualizar urna
DELETE /api/v1/urnas/:id          # Excluir urna
POST   /api/v1/urnas/:numero/ping # Atualizar ping (ESP32)
```

### Eleições
```
GET    /api/v1/eleicoes           # Listar eleições
GET    /api/v1/eleicoes/:id       # Obter eleição específica
POST   /api/v1/eleicoes           # Criar eleição
PUT    /api/v1/eleicoes/:id       # Atualizar eleição
DELETE /api/v1/eleicoes/:id       # Excluir eleição
```

### Candidatos
```
GET    /api/v1/candidatos         # Listar candidatos
GET    /api/v1/candidatos/:id     # Obter candidato específico
POST   /api/v1/candidatos         # Criar candidato (com foto)
PUT    /api/v1/candidatos/:id     # Atualizar candidato
DELETE /api/v1/candidatos/:id     # Excluir candidato
```

### Eleitores
```
GET    /api/v1/eleitores          # Listar eleitores
GET    /api/v1/eleitores/:id      # Obter eleitor específico
POST   /api/v1/eleitores          # Criar eleitor
PUT    /api/v1/eleitores/:id      # Atualizar eleitor
DELETE /api/v1/eleitores/:id      # Excluir eleitor
POST   /api/v1/eleitores/importar # Importar via CSV/Excel
```

### Resultados
```
GET    /api/v1/resultados/:eleicaoId         # Resultados da eleição
GET    /api/v1/resultados/:eleicaoId/exportar # Exportar relatório
```

### Auditoria
```
GET    /api/v1/auditoria                    # Listar logs
GET    /api/v1/auditoria/estatisticas       # Estatísticas de auditoria
GET    /api/v1/auditoria/:id                # Log específico
```

### Rotas da Urna (Votação)
```
POST   /api/eleitores/validar     # Validar eleitor
GET    /api/candidatos            # Obter candidatos
POST   /api/votos                 # Registrar voto
```

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. 

### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@urna.com",
    "senha": "admin123"
  }'
```

### Usando o Token
```bash
curl -H "Authorization: Bearer SEU_TOKEN_JWT" \
  http://localhost:3001/api/v1/dashboard/summary
```

## 🏗️ Níveis de Acesso

- **Admin**: Acesso total (criar, editar, excluir)
- **Operador**: Acesso de leitura e operações básicas

## 📡 WebSocket (Tempo Real)

### Conectar
```javascript
const socket = io('http://localhost:3001');

// Entrar em uma eleição específica
socket.emit('join-election', 'eleicao-uuid');

// Escutar atualizações de votos
socket.on('vote-update', (data) => {
  console.log('Novo voto:', data);
});

// Escutar atualizações de resultados
socket.on('results-update', (data) => {
  console.log('Resultados atualizados:', data);
});
```

### Eventos Disponíveis

- `vote-update`: Novo voto registrado
- `results-update`: Resultados atualizados
- `urna-status`: Status de urna alterado
- `system-alert`: Alertas do sistema

## 🤖 Integração ESP32

A API se comunica com o ESP32 via HTTP. Configure o IP do ESP32 no `.env`:

```env
ESP32_DEFAULT_IP=192.168.1.100
```

### Endpoint do ESP32
```
POST http://192.168.1.100/registrar-voto
Content-Type: application/json

{
  "idCandidato": "uuid-do-candidato",
  "tipoVoto": "candidato",
  "eleitorMatricula": "12345678"
}
```

## 📁 Upload de Arquivos

### Foto de Candidatos
```bash
curl -X POST http://localhost:3001/api/v1/candidatos \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "numero=12" \
  -F "nome=João Silva" \
  -F "partido=Partido X" \
  -F "eleicao_id=uuid-eleicao" \
  -F "foto=@caminho/para/foto.jpg"
```

### Importar Eleitores
```bash
curl -X POST http://localhost:3001/api/v1/eleitores/importar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "eleicao_id=uuid-eleicao" \
  -F "arquivo=@eleitores.csv"
```

Formato do CSV:
```csv
matricula,nome,cpf,email,telefone
12345678,João Silva,12345678901,joao@email.com,11999999999
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:3001/health
```

Resposta:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### Logs
Os logs são salvos em:
- `logs/combined.log`: Todos os logs
- `logs/error.log`: Apenas erros

## 🔒 Segurança

- **Rate Limiting**: 100 requests por 15 minutos
- **Helmet**: Headers de segurança
- **CORS**: Configuração restritiva
- **Validação**: Joi para validação de dados
- **Auditoria**: Log completo de todas as operações

## 🐛 Tratamento de Erros

A API retorna erros padronizados:

```json
{
  "status": "erro",
  "message": "Descrição do erro",
  "details": ["Detalhes adicionais"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Códigos HTTP:
- `200`: Sucesso
- `201`: Criado
- `400`: Dados inválidos
- `401`: Não autorizado
- `403`: Sem permissão
- `404`: Não encontrado
- `409`: Conflito
- `500`: Erro interno
- `503`: Serviço indisponível

## 🚀 Deploy

### Usando PM2
```bash
npm install -g pm2
pm2 start src/server.js --name "api-urna"
pm2 startup
pm2 save
```

### Docker (Opcional)
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
# Executar testes
npm test

# Cobertura de testes
npm run test:coverage
```

## 📚 Exemplos de Uso

### Criar uma Eleição Completa

1. **Criar Eleição**
```bash
curl -X POST http://localhost:3001/api/v1/eleicoes \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Eleição Teste 2024",
    "descricao": "Eleição para teste do sistema",
    "data_inicio": "2024-01-15T08:00:00Z",
    "data_fim": "2024-01-15T17:00:00Z"
  }'
```

2. **Adicionar Candidatos**
```bash
curl -X POST http://localhost:3001/api/v1/candidatos \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "numero=12" \
  -F "nome=Candidato 1" \
  -F "partido=Partido A" \
  -F "eleicao_id=UUID_DA_ELEICAO" \
  -F "foto=@foto1.jpg"
```

3. **Importar Eleitores**
```bash
curl -X POST http://localhost:3001/api/v1/eleitores/importar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "eleicao_id=UUID_DA_ELEICAO" \
  -F "arquivo=@eleitores.csv"
```

4. **Configurar Urnas**
```bash
curl -X POST http://localhost:3001/api/v1/urnas \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "001",
    "localizacao": "Sala 101",
    "ip_address": "192.168.1.100"
  }'
```

## 🤝 Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte, envie um email para suporte@urna.com ou abra uma issue no GitHub.

## 📞 Contato

- **Desenvolvedor**: Seu Nome
- **Email**: seu.email@dominio.com
- **LinkedIn**: [Seu LinkedIn](https://linkedin.com/in/seu-perfil)

---

⭐ **Dê uma estrela no projeto se ele foi útil para você!**#   A p i _ U r n a  
 
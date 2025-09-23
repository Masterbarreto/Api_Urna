# 🚀 Guia de Deploy Completo

## 1. Deploy da API (Render)

### Pré-requisitos
- [ ] Conta no GitHub
- [ ] Conta no Render
- [ ] Conta no Supabase

### Passo a Passo

#### 1.1 Configurar Supabase
```bash
1. Acesse supabase.com
2. Crie novo projeto
3. Anote as credenciais:
   - Project URL
   - anon public key
   - service_role key
```

#### 1.2 Preparar Repositório
```bash
git clone https://github.com/seu-usuario/api-urna-eletronica.git
cd api-urna-eletronica
git add .
git commit -m "Configuração inicial"
git push origin main
```

#### 1.3 Deploy no Render
```yaml
# render.yaml (opcional)
services:
  - type: web
    name: api-urna-eletronica
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

### Variáveis de Ambiente (Render)
```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=sua_chave_secreta_muito_forte_32_caracteres_minimo
CORS_ORIGIN=https://urna-tablet.vercel.app,https://urna-dashboard.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 2. Deploy do Tablet (Vercel)

### Estrutura do Projeto
```bash
npx create-next-app@latest urna-tablet
cd urna-tablet
npm install socket.io-client chart.js react-chartjs-2
```

### Configuração Vercel
```json
{
  "name": "urna-tablet",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://sua-api.onrender.com",
    "NEXT_PUBLIC_ELEICAO_ID": "uuid-da-eleicao",
    "NEXT_PUBLIC_URNA_ID": "uuid-da-urna"
  }
}
```

### Deploy
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 3. Deploy do Dashboard (Netlify)

### Configuração
```bash
npm create vite@latest urna-dashboard --template react
cd urna-dashboard
npm install
npm run build
```

### netlify.toml
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_API_URL = "https://sua-api.onrender.com"
  VITE_SOCKET_URL = "wss://sua-api.onrender.com"
```

---

## 4. Configuração de Domínios

### Cloudflare (Recomendado)
```dns
# DNS Records
Type: CNAME
Name: api
Target: sua-api.onrender.com

Type: CNAME  
Name: tablet
Target: urna-tablet.vercel.app

Type: CNAME
Name: dashboard  
Target: urna-dashboard.netlify.app
```

### Certificados SSL
```yaml
# Render configura automaticamente
# Vercel configura automaticamente  
# Netlify configura automaticamente
```

---

## 5. Monitoramento e Logs

### Health Checks
```javascript
// Configurar alertas para:
// - https://api.seudominio.com/health
// - https://tablet.seudominio.com
// - https://dashboard.seudominio.com

// Uptime Robot (gratuito)
// - Monitoramento a cada 5 minutos
// - Alertas por email/SMS
```

### Logs Centralizados
```javascript
// Logflare ou LogRocket
const logger = {
  info: (message, data) => {
    console.log(message, data);
    // Enviar para serviço externo
    fetch('https://api.logflare.app/logs', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LOGFLARE_KEY },
      body: JSON.stringify({ message, data, timestamp: Date.now() })
    });
  }
};
```

---

## 6. Backup e Recuperação

### Backup Automático (Supabase)
```sql
-- Configurar Point-in-Time Recovery
-- Backup diário automático
-- Retenção de 7 dias
```

### Backup Manual
```bash
# Exportar dados via API
curl -X GET "https://sua-api.onrender.com/api/v1/backup" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -o backup-$(date +%Y%m%d).json
```

---

## 7. Segurança

### HTTPS Everywhere
```javascript
// Forçar HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### Headers de Segurança
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss://sua-api.onrender.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

## 8. Performance

### CDN Configuration
```javascript
// Vercel CDN (automático)
// Netlify CDN (automático)
// Cloudflare CDN (configuração manual)
```

### Cache Strategy
```javascript
// API Cache
app.use('/api/candidatos', cache('5 minutes'));
app.use('/api/resultados', cache('1 minute'));

// Frontend Cache
// Cache-Control: public, max-age=3600
```

---

## 9. Checklist de Go-Live

### Pré-Deploy
- [ ] Testes unitários passando
- [ ] Testes de integração OK
- [ ] Variáveis de ambiente configuradas
- [ ] SSL certificates ativo
- [ ] Backup configurado
- [ ] Monitoramento ativo

### Pós-Deploy
- [ ] Health checks respondendo
- [ ] Logs funcionando
- [ ] Socket.IO conectando
- [ ] ESP32 comunicando
- [ ] Tablet responsivo
- [ ] Dashboard atualizando

### Teste de Carga
```bash
# Artillery.js
npm install -g artillery
artillery quick --count 10 --num 5 https://sua-api.onrender.com/health

# k6 
k6 run --vus 50 --duration 30s script.js
```

---

## 10. Troubleshooting

### Problemas Comuns

#### API não responde
```bash
# Verificar logs no Render
# Verificar variáveis de ambiente
# Testar conexão Supabase
curl https://sua-api.onrender.com/health
```

#### Socket.IO não conecta
```javascript
// Verificar CORS
// Verificar protocolo (wss:// vs ws://)
// Verificar firewall
```

#### ESP32 não comunica
```cpp
// Verificar WiFi
// Verificar URL da API
// Verificar certificado SSL
```

### Comandos Úteis
```bash
# Logs da API
curl https://sua-api.onrender.com/api/v1/logs

# Status do sistema
curl https://sua-api.onrender.com/health

# Reiniciar serviço (Render)
# Via dashboard ou webhook

# Clear cache (Vercel)
vercel --prod --force
```

---

## 📞 Suporte

- **API Issues**: Verificar logs no Render
- **Frontend Issues**: Verificar console do browser  
- **ESP32 Issues**: Verificar Serial Monitor
- **Database Issues**: Verificar dashboard Supabase

**🎯 Com este guia, seu sistema estará 100% operacional na nuvem!**
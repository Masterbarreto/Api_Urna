# 🧪 Scripts de Teste e Validação

## 1. Teste da API

### Postman Collection
```json
{
  "info": {
    "name": "Urna Eletrônica API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{API_URL}}/health",
          "host": ["{{API_URL}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Login Admin",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@urna.com\",\n  \"senha\": \"admin123\"\n}"
        },
        "url": {
          "raw": "{{API_URL}}/api/auth/login",
          "host": ["{{API_URL}}"],
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "Validar Eleitor",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"matricula\": \"001\"\n}"
        },
        "url": {
          "raw": "{{API_URL}}/api/urna-votacao/validar-eleitor",
          "host": ["{{API_URL}}"],
          "path": ["api", "urna-votacao", "validar-eleitor"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "API_URL",
      "value": "https://sua-api.onrender.com"
    }
  ]
}
```

### Teste Automatizado (Jest)
```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../api');

describe('API Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Login para obter token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@urna.com',
        senha: 'admin123'
      });
    
    authToken = response.body.token;
  });

  test('Health check deve retornar 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  test('Validar eleitor válido', async () => {
    const response = await request(app)
      .post('/api/urna-votacao/validar-eleitor')
      .send({ matricula: '001' });
    
    expect(response.status).toBe(200);
    expect(response.body.valido).toBe(true);
  });

  test('Buscar candidatos', async () => {
    const response = await request(app)
      .get('/api/urna-votacao/candidatos/ELEICAO_ID')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.candidatos)).toBe(true);
  });

  test('Registrar voto', async () => {
    const response = await request(app)
      .post('/api/urna-votacao/votar')
      .send({
        eleitor_matricula: '002',
        candidato_id: 'uuid-do-candidato',
        eleicao_id: 'uuid-da-eleicao'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('sucesso');
  });
});
```

---

## 2. Teste do ESP32

### Script de Teste de Conectividade
```cpp
// test_connectivity.ino
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "SUA_REDE";
const char* password = "SUA_SENHA";
const char* apiUrl = "https://sua-api.onrender.com";

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Conectando WiFi...");
  }
  
  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Testar API
  testarAPI();
}

void loop() {
  delay(30000); // Testar a cada 30 segundos
  testarAPI();
}

void testarAPI() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(apiUrl) + "/health");
    
    int httpCode = http.GET();
    
    Serial.print("Teste API - Código: ");
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      String payload = http.getString();
      Serial.println("✅ API OK");
      Serial.println(payload);
    } else {
      Serial.println("❌ API com problema");
    }
    
    http.end();
  } else {
    Serial.println("❌ WiFi desconectado");
  }
}
```

### Teste de Teclado
```cpp
// test_keyboard.ino
#include <Keypad.h>

const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {19, 18, 5, 17};
byte colPins[COLS] = {16, 4, 2, 15};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

void setup() {
  Serial.begin(115200);
  Serial.println("🔧 Teste do Teclado - Pressione qualquer tecla");
}

void loop() {
  char key = keypad.getKey();
  
  if (key) {
    Serial.print("Tecla pressionada: ");
    Serial.println(key);
    
    // Testar buzzer
    tone(22, 1000, 200);
    
    // Testar LEDs
    digitalWrite(21, HIGH); // LED Verde
    delay(200);
    digitalWrite(21, LOW);
  }
}
```

---

## 3. Teste do Frontend

### Cypress E2E Tests
```javascript
// cypress/integration/urna.spec.js
describe('Teste da Urna Eletrônica', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Deve exibir tela inicial', () => {
    cy.contains('URNA ELETRÔNICA');
    cy.contains('Digite sua matrícula');
  });

  it('Deve validar eleitor e mostrar candidatos', () => {
    // Simular evento do ESP32
    cy.window().then((win) => {
      win.socket.emit('eleitor-validado', {
        valido: true,
        podeVotar: true,
        eleitor: { nome: 'Teste', matricula: '001' }
      });
    });

    cy.contains('Bem-vindo(a), Teste!');
    cy.contains('Digite o número do seu candidato');
  });

  it('Deve confirmar voto e exibir sucesso', () => {
    // Simular fluxo completo
    cy.window().then((win) => {
      win.socket.emit('candidato-selecionado', {
        candidato: {
          numero: '10',
          nome: 'João Silva',
          partido: 'Partido A'
        }
      });
    });

    cy.contains('João Silva');
    cy.get('[data-testid="btn-confirmar"]').click();
    cy.contains('VOTO REGISTRADO!');
  });
});
```

### React Testing Library
```javascript
// components/__tests__/UrnaVotacao.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import UrnaVotacao from '../UrnaVotacao';

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  }))
}));

describe('UrnaVotacao', () => {
  test('renderiza tela inicial', () => {
    render(<UrnaVotacao />);
    expect(screen.getByText('URNA ELETRÔNICA')).toBeInTheDocument();
    expect(screen.getByText('Digite sua matrícula no teclado')).toBeInTheDocument();
  });

  test('confirma voto quando botão é clicado', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'sucesso' })
      })
    );
    global.fetch = mockFetch;

    render(<UrnaVotacao />);
    
    // Simular estado de confirmação
    // ... configurar estado via props ou contexto
    
    const btnConfirmar = screen.getByText('CONFIRMAR VOTO');
    fireEvent.click(btnConfirmar);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/urna-votacao/votar'),
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
```

---

## 4. Teste de Carga

### Artillery.js
```yaml
# artillery-config.yml
config:
  target: 'https://sua-api.onrender.com'
  phases:
    - duration: 60
      arrivalRate: 5
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "Teste de votação"
    weight: 70
    flow:
      - post:
          url: "/api/urna-votacao/validar-eleitor"
          json:
            matricula: "{{ $randomInt(1, 1000) }}"
      - get:
          url: "/api/urna-votacao/candidatos/{{ $randomUUID() }}"
      - post:
          url: "/api/urna-votacao/votar"
          json:
            eleitor_matricula: "{{ $randomInt(1, 1000) }}"
            candidato_id: "{{ $randomUUID() }}"
            eleicao_id: "{{ $randomUUID() }}"

  - name: "Teste de dashboard"
    weight: 30
    flow:
      - get:
          url: "/api/v1/dashboard/summary"
      - get:
          url: "/api/v1/resultados/{{ $randomUUID() }}"
```

### K6 Load Test
```javascript
// k6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50, // 50 usuários virtuais
  duration: '30s',
};

export default function() {
  // Teste health check
  let healthRes = http.get('https://sua-api.onrender.com/health');
  check(healthRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Teste validação de eleitor
  let eleitorRes = http.post('https://sua-api.onrender.com/api/urna-votacao/validar-eleitor', 
    JSON.stringify({ matricula: Math.floor(Math.random() * 1000).toString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(eleitorRes, {
    'eleitor validation response': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}
```

---

## 5. Monitoramento Contínuo

### Script de Health Check
```bash
#!/bin/bash
# health-check.sh

API_URL="https://sua-api.onrender.com"
TABLET_URL="https://urna-tablet.vercel.app"
DASHBOARD_URL="https://urna-dashboard.netlify.app"

echo "🔍 Verificando saúde do sistema..."

# Testar API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ $API_STATUS -eq 200 ]; then
    echo "✅ API: OK"
else
    echo "❌ API: ERRO ($API_STATUS)"
    # Enviar alerta
fi

# Testar Tablet
TABLET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $TABLET_URL)
if [ $TABLET_STATUS -eq 200 ]; then
    echo "✅ Tablet: OK"
else
    echo "❌ Tablet: ERRO ($TABLET_STATUS)"
fi

# Testar Dashboard
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DASHBOARD_URL)
if [ $DASHBOARD_STATUS -eq 200 ]; then
    echo "✅ Dashboard: OK"
else
    echo "❌ Dashboard: ERRO ($DASHBOARD_STATUS)"
fi

echo "✅ Verificação completa"
```

### Crontab para Monitoramento
```bash
# Adicionar ao crontab (crontab -e)
*/5 * * * * /home/user/health-check.sh >> /var/log/urna-health.log 2>&1
```

---

## 6. Scripts de Deploy

### Deploy Completo
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy completo..."

# 1. Testar localmente
npm test
if [ $? -ne 0 ]; then
    echo "❌ Testes falharam"
    exit 1
fi

# 2. Build e deploy da API
echo "📦 Deploy da API..."
git add .
git commit -m "Deploy $(date)"
git push origin main

# 3. Deploy do Frontend
echo "🖥️ Deploy do Frontend..."
cd ../urna-tablet
npm run build
vercel --prod

cd ../urna-dashboard  
npm run build
netlify deploy --prod

echo "✅ Deploy completo!"
echo "🔗 API: https://sua-api.onrender.com"
echo "📱 Tablet: https://urna-tablet.vercel.app"
echo "📊 Dashboard: https://urna-dashboard.netlify.app"
```

**🎯 Com estes scripts, você terá um sistema completamente testado e monitorado!**
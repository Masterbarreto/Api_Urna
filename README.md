# 🗳️ Manual Definitivo: Urna Eletrônica Digital

**Sistema completo de votação eletrônica com ESP32, Tablet, API Node.js e Dashboard em tempo real**

---

## 📋 Índice

- [1️⃣ Arquitetura do Sistema](#1️⃣-arquitetura-do-sistema)
- [2️⃣ Banco de Dados](#2️⃣-banco-de-dados)
- [3️⃣ API Node.js](#3️⃣-api-nodejs)
- [4️⃣ ESP32 Hardware](#4️⃣-esp32-hardware)
- [5️⃣ Interface Tablet](#5️⃣-interface-tablet)
- [6️⃣ Dashboard Admin](#6️⃣-dashboard-admin)
- [7️⃣ Deploy no Render](#7️⃣-deploy-no-render)
- [8️⃣ Implementação Completa](#8️⃣-implementação-completa)
- [9️⃣ Boas Práticas](#9️⃣-boas-práticas)

---

## 1️⃣ Arquitetura do Sistema

### 🏗️ Visão Geral

```
🖥️ Dashboard Admin     📱 Tablet Votação     🔧 ESP32 Hardware
      ↓                      ↓                     ↓
      📡 Socket.IO      📡 HTTP/Socket.IO     📡 HTTP/WiFi
                               ↓
                    🌐 API Node.js + Express
                               ↓
                    🗄️ PostgreSQL (Supabase)
```

### 🔄 Fluxo de Votação

1. **Eleitor** digita matrícula no **ESP32**
2. **ESP32** → `POST /api/urna-votacao/validar-eleitor` → **API**
3. **API** valida e retorna status para **Tablet**
4. **Tablet** exibe tela de candidatos (se válido)
5. **Eleitor** digita número do candidato no **ESP32**
6. **API** retorna dados do candidato para **Tablet**
7. **Tablet** exibe candidato para confirmação
8. **Eleitor** confirma voto → **API** registra
9. **API** emite evento Socket.IO → **Dashboard** atualiza em tempo real

### 🎯 Principais Componentes

- **API Node.js**: Backend central com autenticação JWT
- **PostgreSQL**: Banco relacional com integridade referencial
- **Socket.IO**: Comunicação em tempo real
- **ESP32**: Hardware para entrada de dados
- **Tablet**: Interface de votação e confirmação
- **Dashboard**: Monitoramento e administração

---

## 2️⃣ Banco de Dados

### 📊 Modelo Relacional Completo

```sql
-- Usuários do sistema (admin/operadores)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'operador' CHECK (tipo IN ('admin', 'operador')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eleições
CREATE TABLE eleicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'criada' CHECK (status IN ('criada', 'ativa', 'finalizada')),
    total_votos INTEGER DEFAULT 0,
    total_eleitores INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Urnas físicas
CREATE TABLE urnas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) UNIQUE NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'manutencao')),
    ip_address INET,
    eleicao_id UUID REFERENCES eleicoes(id),
    ultimo_ping TIMESTAMP WITH TIME ZONE,
    total_votos INTEGER DEFAULT 0
);

-- Candidatos
CREATE TABLE candidatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(10) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    partido VARCHAR(100) NOT NULL,
    foto_url VARCHAR(500),
    eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
    total_votos INTEGER DEFAULT 0,
    UNIQUE(numero, eleicao_id)
);

-- Eleitores
CREATE TABLE eleitores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    email VARCHAR(255),
    eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
    ja_votou BOOLEAN DEFAULT false,
    horario_voto TIMESTAMP WITH TIME ZONE,
    urna_voto_id UUID REFERENCES urnas(id),
    UNIQUE(matricula, eleicao_id)
);

-- Votos (com anonimato garantido)
CREATE TABLE votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleitor_matricula VARCHAR(50) NOT NULL,
    candidato_id UUID REFERENCES candidatos(id),
    eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
    urna_id UUID REFERENCES urnas(id),
    tipo_voto VARCHAR(20) NOT NULL CHECK (tipo_voto IN ('candidato', 'nulo', 'branco')),
    hash_verificacao VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auditoria completa
CREATE TABLE logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    acao VARCHAR(100) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🔐 Índices e Constraints

```sql
-- Índices para performance
CREATE INDEX idx_eleicoes_status ON eleicoes(status);
CREATE INDEX idx_votos_eleicao ON votos(eleicao_id);
CREATE INDEX idx_eleitores_matricula ON eleitores(matricula);
CREATE INDEX idx_candidatos_eleicao ON candidatos(eleicao_id);

-- Triggers para auditoria automática
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_auditoria (acao, tabela_afetada, registro_id, dados_novos)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 3️⃣ API Node.js

### 🚀 Estrutura Principal

```javascript
// index.js - Entry point
const app = require('./api');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 API Urna Eletrônica rodando na porta ${PORT}`);
});
```

```javascript
// api/index.js - Aplicação principal
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rotas principais
app.use('/api', routes);

// Socket.IO para tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join-election', (eleicaoId) => {
    socket.join(`eleicao-${eleicaoId}`);
  });
});

module.exports = app;
```

### 📍 Rotas Essenciais

#### **Autenticação**
```javascript
// POST /api/auth/login
{
  "email": "admin@urna.com",
  "senha": "admin123"
}
// Resposta: { token, user, expiresIn }
```

#### **Validação de Eleitor (ESP32)**
```javascript
// POST /api/urna-votacao/validar-eleitor
{
  "matricula": "12345"
}
// Resposta: { valido: true, eleitor: {...}, podeVotar: true }
```

#### **Buscar Candidato**
```javascript
// GET /api/urna-votacao/candidatos/{eleicaoId}?numero=10
// Resposta: { candidato: { numero, nome, partido, foto_url } }
```

#### **Registrar Voto**
```javascript
// POST /api/urna-votacao/votar
{
  "eleitor_matricula": "12345",
  "candidato_id": "uuid-do-candidato",
  "eleicao_id": "uuid-da-eleicao",
  "urna_id": "uuid-da-urna"
}
// Emite: socket.emit('voto-registrado', dados)
```

### 🔒 Middleware de Segurança

```javascript
// api/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token necessário' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};
```

---

## 4️⃣ ESP32 Hardware

### 🔧 Código Arduino/PlatformIO

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Keypad.h>

// Configurações WiFi
const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";
const char* apiUrl = "https://sua-api.onrender.com";

// Configuração do teclado 4x4
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

// Variáveis globais
String matriculaAtual = "";
String candidatoAtual = "";
bool aguardandoMatricula = true;

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Conectando WiFi...");
  }
  Serial.println("WiFi conectado!");
  
  // Configurar pinos
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  Serial.println("🗳️ Urna Eletrônica ESP32 - Digite sua matrícula:");
}

void loop() {
  char key = keypad.getKey();
  
  if (key) {
    Serial.print("Tecla: ");
    Serial.println(key);
    
    if (key == '#') {
      // Confirmar entrada
      if (aguardandoMatricula) {
        validarEleitor(matriculaAtual);
      } else {
        buscarCandidato(candidatoAtual);
      }
    } else if (key == '*') {
      // Limpar/Cancelar
      limparEntrada();
    } else if (key >= '0' && key <= '9') {
      // Adicionar dígito
      if (aguardandoMatricula) {
        matriculaAtual += key;
        Serial.println("Matrícula: " + matriculaAtual);
      } else {
        candidatoAtual += key;
        Serial.println("Candidato: " + candidatoAtual);
      }
    }
  }
  
  delay(100);
}

void validarEleitor(String matricula) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(apiUrl) + "/api/urna-votacao/validar-eleitor");
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"matricula\":\"" + matricula + "\"}";
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, response);
      
      if (doc["valido"] == true && doc["podeVotar"] == true) {
        Serial.println("✅ Eleitor válido! Digite o número do candidato:");
        aguardandoMatricula = false;
        candidatoAtual = "";
        tocarSucesso();
      } else {
        Serial.println("❌ Eleitor inválido ou já votou!");
        tocarErro();
        limparEntrada();
      }
    } else {
      Serial.println("❌ Erro na comunicação com API");
      tocarErro();
    }
    
    http.end();
  }
}

void buscarCandidato(String numero) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(apiUrl) + "/api/urna-votacao/candidatos/ELEICAO_ID?numero=" + numero);
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, response);
      
      if (doc["candidato"]["nome"]) {
        Serial.println("✅ Candidato: " + String((const char*)doc["candidato"]["nome"]));
        Serial.println("Partido: " + String((const char*)doc["candidato"]["partido"]));
        Serial.println("Aguarde confirmação no tablet...");
        tocarSucesso();
      } else {
        Serial.println("❌ Candidato não encontrado!");
        tocarErro();
      }
    }
    
    http.end();
  }
}

void tocarSucesso() {
  digitalWrite(LED_BUILTIN, HIGH);
  tone(BUZZER_PIN, 1000, 200);
  delay(300);
  digitalWrite(LED_BUILTIN, LOW);
}

void tocarErro() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 500, 100);
    delay(150);
  }
}

void limparEntrada() {
  matriculaAtual = "";
  candidatoAtual = "";
  aguardandoMatricula = true;
  Serial.println("🗳️ Digite sua matrícula:");
}
```

### 📦 Componentes Necessários

- **ESP32 DevKit**
- **Teclado matricial 4x4**
- **Buzzer 5V**
- **LEDs indicadores**
- **Resistores 220Ω**
- **Fonte 5V**

---

## 5️⃣ Interface Tablet

### 📱 Aplicação React/Next.js

```jsx
// components/UrnaVotacao.jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL);

export default function UrnaVotacao() {
  const [etapa, setEtapa] = useState('aguardando'); // aguardando | candidato | confirmacao | sucesso
  const [candidatoAtual, setCandidatoAtual] = useState(null);
  const [eleitorAtual, setEleitorAtual] = useState(null);

  useEffect(() => {
    // Escutar eventos do ESP32 via Socket.IO
    socket.on('eleitor-validado', (data) => {
      if (data.valido && data.podeVotar) {
        setEleitorAtual(data.eleitor);
        setEtapa('candidato');
      }
    });

    socket.on('candidato-selecionado', (data) => {
      if (data.candidato) {
        setCandidatoAtual(data.candidato);
        setEtapa('confirmacao');
      }
    });

    socket.on('voto-registrado', () => {
      setEtapa('sucesso');
      setTimeout(() => {
        resetarUrna();
      }, 3000);
    });

    return () => socket.disconnect();
  }, []);

  const confirmarVoto = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/urna-votacao/votar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eleitor_matricula: eleitorAtual.matricula,
          candidato_id: candidatoAtual.id,
          eleicao_id: process.env.NEXT_PUBLIC_ELEICAO_ID,
          urna_id: process.env.NEXT_PUBLIC_URNA_ID
        })
      });

      if (response.ok) {
        setEtapa('sucesso');
        setTimeout(resetarUrna, 3000);
      }
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
    }
  };

  const resetarUrna = () => {
    setEtapa('aguardando');
    setCandidatoAtual(null);
    setEleitorAtual(null);
  };

  return (
    <div className="urna-container">
      {etapa === 'aguardando' && (
        <div className="tela-aguardando">
          <h1>🗳️ URNA ELETRÔNICA</h1>
          <p>Digite sua matrícula no teclado</p>
          <div className="loading-spinner"></div>
        </div>
      )}

      {etapa === 'candidato' && eleitorAtual && (
        <div className="tela-eleitor">
          <h2>Bem-vindo(a), {eleitorAtual.nome}!</h2>
          <p>Digite o número do seu candidato no teclado</p>
        </div>
      )}

      {etapa === 'confirmacao' && candidatoAtual && (
        <div className="tela-confirmacao">
          <h2>Confirme seu voto:</h2>
          <div className="candidato-card">
            {candidatoAtual.foto_url && (
              <img src={candidatoAtual.foto_url} alt={candidatoAtual.nome} />
            )}
            <h3>Número: {candidatoAtual.numero}</h3>
            <h4>{candidatoAtual.nome}</h4>
            <p>{candidatoAtual.partido}</p>
          </div>
          
          <div className="botoes-confirmacao">
            <button onClick={confirmarVoto} className="btn-confirmar">
              ✅ CONFIRMAR VOTO
            </button>
            <button onClick={resetarUrna} className="btn-cancelar">
              ❌ CANCELAR
            </button>
          </div>
        </div>
      )}

      {etapa === 'sucesso' && (
        <div className="tela-sucesso">
          <h1>✅ VOTO REGISTRADO!</h1>
          <p>Obrigado por participar</p>
          <div className="confete-animation"></div>
        </div>
      )}
    </div>
  );
}
```

### 🎨 CSS para Tablet

```css
/* styles/urna.css */
.urna-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
}

.candidato-card {
  background: white;
  color: #333;
  padding: 2rem;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  margin: 2rem 0;
}

.candidato-card img {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
}

.botoes-confirmacao {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.btn-confirmar, .btn-cancelar {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-confirmar {
  background: #4CAF50;
  color: white;
}

.btn-cancelar {
  background: #f44336;
  color: white;
}

.btn-confirmar:hover, .btn-cancelar:hover {
  transform: scale(1.05);
}

@keyframes confete {
  0% { transform: translateY(-100vh) rotate(0deg); }
  100% { transform: translateY(100vh) rotate(360deg); }
}

.confete-animation::before {
  content: '🎉🎊✨';
  position: absolute;
  animation: confete 3s ease-in-out infinite;
}
```

---

## 6️⃣ Dashboard Admin

### 📊 Interface de Monitoramento

```jsx
// components/Dashboard.jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const socket = io(process.env.NEXT_PUBLIC_API_URL);

export default function Dashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalVotos: 0,
    totalEleitores: 0,
    percentualParticipacao: 0,
    urnasOnline: 0
  });
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    carregarDados();

    // Atualizações em tempo real
    socket.on('voto-registrado', () => {
      carregarDados();
    });

    socket.on('urna-status', (data) => {
      setEstatisticas(prev => ({
        ...prev,
        urnasOnline: data.urnasOnline
      }));
    });

    return () => socket.disconnect();
  }, []);

  const carregarDados = async () => {
    try {
      const [statsRes, resultadosRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/resultados/${process.env.NEXT_PUBLIC_ELEICAO_ID}`)
      ]);

      const stats = await statsRes.json();
      const results = await resultadosRes.json();

      setEstatisticas(stats.data);
      setResultados(results.data.candidatos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const chartData = {
    labels: resultados.map(c => `${c.numero} - ${c.nome}`),
    datasets: [{
      data: resultados.map(c => c.total_votos),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ]
    }]
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🗳️ Dashboard - Eleição 2024</h1>
        <div className="status-indicator">
          <span className={`status ${estatisticas.urnasOnline > 0 ? 'online' : 'offline'}`}>
            {estatisticas.urnasOnline} urnas online
          </span>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total de Votos</h3>
          <div className="stat-value">{estatisticas.totalVotos}</div>
        </div>
        
        <div className="stat-card">
          <h3>Total de Eleitores</h3>
          <div className="stat-value">{estatisticas.totalEleitores}</div>
        </div>
        
        <div className="stat-card">
          <h3>Participação</h3>
          <div className="stat-value">{estatisticas.percentualParticipacao}%</div>
        </div>
        
        <div className="stat-card">
          <h3>Urnas Online</h3>
          <div className="stat-value">{estatisticas.urnasOnline}</div>
        </div>
      </div>

      <div className="results-section">
        <div className="chart-container">
          <h2>Resultados em Tempo Real</h2>
          <Pie data={chartData} options={{
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }} />
        </div>

        <div className="results-table">
          <h2>Ranking de Candidatos</h2>
          <table>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Número</th>
                <th>Candidato</th>
                <th>Partido</th>
                <th>Votos</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {resultados
                .sort((a, b) => b.total_votos - a.total_votos)
                .map((candidato, index) => (
                <tr key={candidato.id}>
                  <td>{index + 1}º</td>
                  <td>{candidato.numero}</td>
                  <td>{candidato.nome}</td>
                  <td>{candidato.partido}</td>
                  <td>{candidato.total_votos}</td>
                  <td>{((candidato.total_votos / estatisticas.totalVotos) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 7️⃣ Deploy no Render

### 🚀 Passo a Passo Completo

#### **1. Preparar Supabase**

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **Settings → API** e copie:
   - Project URL
   - anon public key  
   - service_role key

#### **2. Deploy da API**

1. Faça fork/clone deste repositório
2. No [Render](https://render.com), crie novo **Web Service**
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js

#### **3. Variáveis de Ambiente**

```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=sua_chave_secreta_minimo_32_caracteres
CORS_ORIGIN=https://sua-app-tablet.onrender.com
```

#### **4. Primeira Inicialização**

O sistema criará automaticamente:
- ✅ Todas as tabelas do banco
- ✅ Usuário admin padrão
- ✅ Eleição de exemplo
- ✅ Candidatos e eleitores de teste

#### **5. Credenciais Padrão**

```
Email: admin@urna.com
Senha: admin123
```

⚠️ **Alterar imediatamente em produção!**

### 📱 Deploy do Frontend

Para tablet e dashboard, use **Vercel** ou **Netlify**:

```bash
# Tablet (Next.js)
npm create next-app@latest urna-tablet
cd urna-tablet
npm run build
# Deploy no Vercel

# Dashboard (React/Vite)
npm create vite@latest urna-dashboard -- --template react
cd urna-dashboard
npm run build
# Deploy no Netlify
```

---

## 8️⃣ Implementação Completa

### 🏁 Checklist de Implementação

#### **Fase 1: Preparação (1-2 dias)**
- [ ] Criar conta Supabase
- [ ] Configurar projeto no GitHub
- [ ] Deploy da API no Render
- [ ] Testar endpoints via Postman

#### **Fase 2: Hardware ESP32 (2-3 dias)**
- [ ] Conectar teclado matricial 4x4
- [ ] Programar comunicação WiFi
- [ ] Implementar validação de eleitor
- [ ] Testar busca de candidatos
- [ ] Adicionar buzzer e LEDs

#### **Fase 3: Interface Tablet (3-4 dias)**
- [ ] Criar projeto Next.js/React
- [ ] Implementar telas de votação
- [ ] Conectar Socket.IO
- [ ] Estilizar para tablet (responsivo)
- [ ] Testar fluxo completo

#### **Fase 4: Dashboard Admin (2-3 dias)**
- [ ] Criar interface administrativa
- [ ] Implementar gráficos em tempo real
- [ ] Sistema de relatórios
- [ ] Controle de urnas
- [ ] Logs de auditoria

#### **Fase 5: Integração e Testes (2-3 dias)**
- [ ] Testar fluxo ESP32 → API → Tablet
- [ ] Validar atualizações em tempo real
- [ ] Teste de carga com múltiplos votos
- [ ] Validar integridade dos dados
- [ ] Documentar processo

### 🔧 Configuração Rápida

```bash
# 1. Clone e configure a API
git clone https://github.com/seu-usuario/api-urna-eletronica.git
cd api-urna-eletronica
npm install
cp .env.example .env
# Editar .env com suas credenciais
npm run setup
npm start

# 2. Programe o ESP32
# Abra Arduino IDE ou PlatformIO
# Cole o código fornecido
# Configure WiFi e URL da API
# Upload para ESP32

# 3. Configure o Tablet
npx create-next-app@latest urna-tablet
cd urna-tablet
# Adicione o código React fornecido
npm run dev

# 4. Configure o Dashboard
npx create-vite@latest urna-dashboard --template react
cd urna-dashboard
# Adicione o código do dashboard
npm run dev
```

---

## 9️⃣ Boas Práticas

### 🔒 Segurança

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

// Validação rigorosa
const Joi = require('joi');
const votoSchema = Joi.object({
  eleitor_matricula: Joi.string().required(),
  candidato_id: Joi.string().uuid().required(),
  eleicao_id: Joi.string().uuid().required()
});

// Auditoria automática
const auditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    if (req.method !== 'GET') {
      logAuditoria(req.user?.id, req.method, req.path, req.body);
    }
  });
  next();
};
```

### 📊 Performance

```javascript
// Cache para candidatos
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

app.get('/api/candidatos', (req, res) => {
  const cacheKey = `candidatos_${req.query.eleicao_id}`;
  let candidatos = cache.get(cacheKey);
  
  if (!candidatos) {
    candidatos = await buscarCandidatos(req.query.eleicao_id);
    cache.set(cacheKey, candidatos);
  }
  
  res.json(candidatos);
});

// Índices de banco
CREATE INDEX CONCURRENTLY idx_votos_eleicao_data 
ON votos(eleicao_id, created_at);

CREATE INDEX CONCURRENTLY idx_eleitores_matricula_eleicao 
ON eleitores(matricula, eleicao_id);
```

### 🔄 Monitoramento

```javascript
// Health check completo
app.get('/health', async (req, res) => {
  const checks = {
    api: 'OK',
    database: await testDatabaseConnection(),
    redis: await testRedisConnection(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };
  
  const status = Object.values(checks).every(c => c === 'OK' || typeof c !== 'string') 
    ? 200 : 503;
    
  res.status(status).json(checks);
});

// Logs estruturados
const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 🚀 Escalabilidade

```javascript
// Configuração para múltiplas instâncias
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} morreu`);
    cluster.fork();
  });
} else {
  require('./app');
}

// Redis para sessões compartilhadas
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

---

## 🎯 Considerações Finais

### ✅ **Sistema Completo Inclui:**

- **Backend robusto** com autenticação JWT e auditoria
- **Banco relacional** com integridade referencial
- **Hardware ESP32** para entrada de dados  
- **Interface tablet** responsiva e intuitiva
- **Dashboard admin** com gráficos em tempo real
- **Deploy automatizado** no Render
- **Documentação completa** e exemplos práticos

### 🚀 **Próximos Passos:**

1. **Teste o sistema** seguindo este manual
2. **Customize** conforme suas necessidades
3. **Adicione recursos** como biometria ou impressão
4. **Escale** para múltiplas eleições simultâneas

### 📞 **Suporte:**

- Documentação completa da API: `/api/docs`
- Logs detalhados: `/logs/combined.log`
- Health check: `/health`
- Dashboard de monitoramento em tempo real

---

**⚡ Este manual fornece tudo necessário para implementar uma urna eletrônica completa, segura e escalável!**
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

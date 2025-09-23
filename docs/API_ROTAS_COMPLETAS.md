# 🚀 **API ROTAS COMPLETAS - PAINEL ADMINISTRATIVO**

## **📋 MAPEAMENTO COMPLETO DAS ROTAS**

### **🔐 1. Autenticação (`/api/v1/auth`)**

#### **POST /api/v1/auth/login**
- **Descrição**: Autenticar usuário e retornar JWT
- **Request Body**: `{ "email": "admin@urna.com", "password": "123456" }`
- **Response (200)**: 
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "nome": "Administrador",
      "email": "admin@urna.com",
      "tipo": "admin"
    }
  }
}
```

#### **GET /api/v1/auth/me**
- **Descrição**: Obter dados do usuário logado
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**: 
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Administrador", 
    "email": "admin@urna.com",
    "tipo": "admin"
  }
}
```

---

### **📊 2. Dashboard (`/api/v1/dashboard`)**

#### **GET /api/v1/dashboard/summary**
- **Descrição**: Dados agregados para cards principais
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "statusUrna": "Ativa",
    "conexaoUrna": "Online", 
    "totalVotos": 1234,
    "totalEleitores": 5000,
    "percentualParticipacao": 24.68,
    "urnasOnline": 3,
    "totalUrnas": 5,
    "eleicaoAtiva": {
      "id": "uuid",
      "titulo": "Eleição Estudantil 2024"
    },
    "distribuicaoVotos": {
      "candidatos": 1000,
      "nulos": 150, 
      "brancos": 84
    },
    "horaUltimaAtualizacao": "2024-03-15T10:30:00Z"
  }
}
```

---

### **🗳️ 3. Urnas (`/api/v1/urnas`)**

#### **GET /api/v1/urnas**
- **Descrição**: Listar todas as urnas com paginação e filtros
- **Query Params**: `?page=1&limit=10&search=Escola&sortBy=numero&order=asc`
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "numero": "001",
        "localizacao": "Escola Municipal Centro",
        "status": "ativa",
        "ip_address": "192.168.1.100",
        "ultimo_ping": "2024-03-15T10:29:45Z",
        "total_votos": 45,
        "eleicao_atual": "Eleição Estudantil 2024"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "limit": 10
    }
  }
}
```

#### **POST /api/v1/urnas**
- **Request Body**: `{ "numero": "006", "localizacao": "Escola Norte", "ip_address": "192.168.1.106" }`

#### **PUT /api/v1/urnas/{id}**
- **Request Body**: `{ "numero": "006", "localizacao": "Escola Norte Atualizada" }`

#### **DELETE /api/v1/urnas/{id}**
- **Response (204)**: No Content

---

### **🗳️ 4. Eleições (`/api/v1/eleicoes`)**

#### **GET /api/v1/eleicoes**
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "titulo": "Eleição Estudantil 2024",
        "descricao": "Eleição para representante estudantil",
        "data_inicio": "2024-03-15T08:00:00Z",
        "data_fim": "2024-03-15T17:00:00Z", 
        "status": "ativa",
        "total_votos": 1234,
        "total_eleitores": 5000,
        "candidatos_count": 4,
        "urnas_count": 5
      }
    ]
  }
}
```

#### **GET /api/v1/eleicoes/{id}**
- **Response (200)**: Eleição específica com candidatos incluídos

#### **POST /api/v1/eleicoes**
- **Request Body**:
```json
{
  "titulo": "Eleição Municipal 2024",
  "descricao": "Eleição para prefeito",
  "data_inicio": "2024-10-06T08:00:00Z",
  "data_fim": "2024-10-06T17:00:00Z",
  "urna_ids": ["uuid1", "uuid2"],
  "candidato_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### **👤 5. Candidatos (`/api/v1/candidatos`)**

#### **GET /api/v1/candidatos**
- **Query Params**: `?eleicao_id=uuid&search=João`
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "numero": "10",
        "nome": "João da Silva",
        "partido": "Partido Estudantil",
        "foto_url": "https://api.com/uploads/candidatos/foto.jpg",
        "eleicao_id": "uuid",
        "total_votos": 450
      }
    ]
  }
}
```

#### **POST /api/v1/candidatos** ⭐ **MULTIPART/FORM-DATA**
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `nome`: "Maria Santos"
  - `numero`: "20" 
  - `partido`: "Partido Verde"
  - `eleicao_id`: "uuid"
  - `foto`: [arquivo de imagem]
- **Response (201)**: Candidato criado com `foto_url` já populada

#### **PUT /api/v1/candidatos/{id}** ⭐ **MULTIPART/FORM-DATA**
- **Content-Type**: `multipart/form-data`
- **Form Fields**: Mesmos campos do POST, foto é opcional

---

### **👥 6. Eleitores (`/api/v1/eleitores`)**

#### **GET /api/v1/eleitores**
- **Query Params**: `?page=1&limit=20&search=João&eleicao_id=uuid`
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "matricula": "2024001",
        "nome": "João Aluno",
        "cpf": "12345678901", 
        "email": "joao@escola.com",
        "telefone": "(11) 99999-9999",
        "ja_votou": false,
        "horario_voto": null,
        "eleicao_id": "uuid"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalItems": 500,
      "limit": 20
    }
  }
}
```

#### **POST /api/v1/eleitores/importar** ⭐ **UPLOAD DE ARQUIVO**
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `arquivo`: [arquivo CSV/Excel]
  - `eleicao_id`: "uuid"
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Importação processada com sucesso",
    "importados": 145,
    "falharam": 5,
    "erros": [
      "Linha 23: CPF inválido",
      "Linha 31: Matrícula duplicada",
      "Linha 47: Nome obrigatório"
    ]
  }
}
```

#### **POST /api/v1/eleitores**
- **Request Body**: `{ "matricula": "2024500", "nome": "Ana Costa", "cpf": "98765432100", "eleicao_id": "uuid" }`

---

### **📈 7. Resultados (`/api/v1/resultados`)**

#### **GET /api/v1/resultados/{eleicao_id}**
- **Descrição**: Dados para gráficos e estatísticas
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "eleicao": {
      "id": "uuid",
      "titulo": "Eleição Estudantil 2024",
      "status": "ativa"
    },
    "resumo": {
      "totalVotos": 1234,
      "votosValidos": 1000,
      "votosNulos": 150,
      "votosBrancos": 84,
      "abstencoes": 3766,
      "percentualComparecimento": 24.68
    },
    "candidatos": [
      {
        "id": "uuid",
        "nome": "João da Silva", 
        "numero": "10",
        "partido": "Partido Estudantil",
        "votos": 450,
        "percentual": 45.0,
        "foto_url": "https://api.com/uploads/candidatos/foto.jpg"
      },
      {
        "id": "uuid2",
        "nome": "Maria Santos",
        "numero": "20", 
        "partido": "Partido Verde",
        "votos": 350,
        "percentual": 35.0,
        "foto_url": "https://api.com/uploads/candidatos/foto2.jpg"
      }
    ],
    "graficoTempo": [
      { "hora": "08:00", "votos": 45 },
      { "hora": "09:00", "votos": 123 },
      { "hora": "10:00", "votos": 267 }
    ]
  }
}
```

#### **GET /api/v1/resultados/{eleicao_id}/exportar**
- **Descrição**: Download do relatório em PDF/CSV
- **Query Params**: `?formato=pdf` ou `?formato=csv`
- **Response**: Arquivo com headers apropriados

---

### **📋 8. Auditoria (`/api/v1/auditoria`)**

#### **GET /api/v1/auditoria**
- **Query Params**: `?page=1&limit=50&acao=LOGIN&data_inicio=2024-03-01&data_fim=2024-03-15`
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "usuario": "admin@urna.com",
        "acao": "LOGIN",
        "tabela_afetada": "usuarios",
        "registro_id": "uuid",
        "ip_address": "192.168.1.50",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2024-03-15T10:30:00Z"
      }
    ]
  }
}
```

---

## **🔧 IMPLEMENTAÇÃO NECESSÁRIA**

### **✅ JÁ IMPLEMENTADO**
- ✅ Autenticação JWT
- ✅ Dashboard summary
- ✅ CRUD básico de urnas, eleições, candidatos, eleitores
- ✅ Auditoria
- ✅ Socket.IO para tempo real

### **⚠️ PRECISA AJUSTAR**
1. **Upload de fotos candidatos** (multipart/form-data)
2. **Importação de eleitores** (CSV/Excel) 
3. **Padronização de rotas** (/api/v1/)
4. **Paginação** em todas as listagens
5. **Filtros e busca** avançados
6. **Exportação de relatórios**

### **🎯 PRÓXIMOS PASSOS**
1. Implementar upload de imagens
2. Criar importação em lote
3. Padronizar respostas da API
4. Adicionar paginação
5. Testes das rotas
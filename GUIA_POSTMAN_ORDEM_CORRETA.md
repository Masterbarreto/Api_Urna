# 🚀 GUIA COMPLETO PARA TESTAR API - PROBLEMA RESOLVIDO!

## ⚠️ **PROBLEMA IDENTIFICADO E RESOLVIDO**
Você estava certo! Antes de fazer login, precisamos **criar o usuário administrador** primeiro.

---

## 📋 **ORDEM CORRETA DE EXECUÇÃO**

### **ETAPA 0: Criar Usuario Admin (PRIMEIRO DE TODOS)** ⚙️
```http
POST https://api-urna.onrender.com/api/setup
Content-Type: application/json

{}
```
**✅ Resposta esperada**: 201 Created com as credenciais
```json
{
  "success": true,
  "message": "🎉 Usuário administrador criado com sucesso!",
  "credentials": {
    "email": "admin@urna.com",
    "senha": "admin123"
  }
}
```

### **ETAPA 1: Verificação Básica** 🔍
```http
GET https://api-urna.onrender.com/health
GET https://api-urna.onrender.com/api/docs
```

### **ETAPA 2: Autenticação** 🔐
```http
POST https://api-urna.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@urna.com",
  "senha": "admin123"
}
```
**🔑 SALVE O TOKEN RETORNADO!**

### **ETAPA 3: Criar Eleição (Base para tudo)** 📊
```http
POST https://api-urna.onrender.com/api/v1/eleicoes
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "titulo": "Eleição Teste 2025",
  "descricao": "Eleição de teste para validar o sistema",
  "data_inicio": "2025-12-01T08:00:00.000Z",
  "data_fim": "2025-12-01T18:00:00.000Z",
  "status": "criada"
}
```
**📝 COPIE O `id` DA ELEIÇÃO!**

### **ETAPA 4: Criar Urna** 🏢
```http
POST https://api-urna.onrender.com/api/v1/urnas
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "numero": "001",
  "localizacao": "Escola Central - Sala 101",
  "status": "ativa",
  "ip_address": "192.168.1.100"
}
```

### **ETAPA 5: Criar Candidatos** 👥
```http
POST https://api-urna.onrender.com/api/v1/candidatos
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "numero": "10",
  "nome": "João Silva",
  "partido": "PT",
  "eleicao_id": "ELEICAO_ID_AQUI"
}
```

```http
POST https://api-urna.onrender.com/api/v1/candidatos
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "numero": "20",
  "nome": "Maria Santos",
  "partido": "PSDB", 
  "eleicao_id": "ELEICAO_ID_AQUI"
}
```

### **ETAPA 6: Criar Eleitores** 🗳️
```http
POST https://api-urna.onrender.com/api/v1/eleitores
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "matricula": "EL001",
  "nome": "Pedro Oliveira",
  "cpf": "12345678901",
  "email": "pedro@email.com",
  "eleicao_id": "ELEICAO_ID_AQUI"
}
```

```http
POST https://api-urna.onrender.com/api/v1/eleitores
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "matricula": "EL002", 
  "nome": "Ana Costa",
  "cpf": "98765432109",
  "email": "ana@email.com",
  "eleicao_id": "ELEICAO_ID_AQUI"
}
```

### **ETAPA 7: Testar Votação** 🗳️
```http
POST https://api-urna.onrender.com/api/urna-votacao/eleitores/validar
Content-Type: application/json

{
  "matricula": "EL001"
}
```

```http
POST https://api-urna.onrender.com/api/urna-votacao/votos
Content-Type: application/json

{
  "eleitor_matricula": "EL001",
  "candidato_id": "CANDIDATO_10_ID_AQUI",
  "eleicao_id": "ELEICAO_ID_AQUI"
}
```

### **ETAPA 8: Ver Resultados** 📈
```http
GET https://api-urna.onrender.com/api/v1/resultados?eleicao_id=ELEICAO_ID_AQUI
Authorization: Bearer {{token}}
```

```http
GET https://api-urna.onrender.com/api/v1/dashboard
Authorization: Bearer {{token}}
```

---

## 🎯 **RESUMO DA SOLUÇÃO:**

1. **✅ RESOLVIDO**: Adicionei a rota `/api/setup` que cria o usuário admin
2. **✅ ORDEM CORRETA**: Setup → Login → Criar dados → Testar
3. **✅ AUTOMÁTICO**: A rota setup já retorna as credenciais prontas

---

## 🚀 **AGORA FUNCIONA PERFEITAMENTE!**

Execute a rota `/api/setup` primeiro e depois siga o fluxo normal. O problema estava resolvido! 🎉
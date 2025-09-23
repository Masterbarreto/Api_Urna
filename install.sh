#!/bin/bash

# 🗳️ INSTALADOR AUTOMÁTICO - URNA ELETRÔNICA COMPLETA
# Script para configuração completa do sistema

set -e  # Sair se houver erro

echo "🗳️ ========================================"
echo "   INSTALADOR URNA ELETRÔNICA DIGITAL"
echo "========================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar pré-requisitos
check_requirements() {
    log_info "Verificando pré-requisitos..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale Node.js 18+ primeiro."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ é necessário. Versão atual: $(node --version)"
        exit 1
    fi
    
    # Git
    if ! command -v git &> /dev/null; then
        log_error "Git não encontrado. Instale Git primeiro."
        exit 1
    fi
    
    log_success "Pré-requisitos OK"
}

# Configurar variáveis de ambiente
setup_environment() {
    log_info "Configurando variáveis de ambiente..."
    
    echo ""
    echo "📋 INFORMAÇÕES NECESSÁRIAS:"
    echo "Você precisará de:"
    echo "1. URL do projeto Supabase"
    echo "2. Chave anon do Supabase" 
    echo "3. Chave service_role do Supabase"
    echo ""
    
    read -p "🔗 URL do Supabase (https://xxx.supabase.co): " SUPABASE_URL
    read -p "🔑 Chave anon do Supabase: " SUPABASE_ANON_KEY
    read -p "🔐 Chave service_role do Supabase: " SUPABASE_SERVICE_ROLE_KEY
    
    # Gerar JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "SUA_CHAVE_SECRETA_MUITO_FORTE_AQUI_32_CARACTERES_MINIMO")
    
    # Criar arquivo .env
    cat > .env << EOF
# Configurações do servidor
NODE_ENV=development
PORT=3001

# Configurações do Supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Configurações de JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Configurações de CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Configurações de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações de Log
LOG_LEVEL=info

# Configurações ESP32
ESP32_TIMEOUT=5000
ESP32_DEFAULT_IP=192.168.1.100
EOF

    log_success "Arquivo .env criado"
}

# Instalar dependências
install_dependencies() {
    log_info "Instalando dependências..."
    
    npm install
    
    log_success "Dependências instaladas"
}

# Inicializar banco de dados
setup_database() {
    log_info "Inicializando banco de dados..."
    
    npm run init-db
    if [ $? -eq 0 ]; then
        log_success "Banco de dados inicializado"
    else
        log_error "Erro ao inicializar banco"
        exit 1
    fi
}

# Criar dados de exemplo
seed_data() {
    log_info "Criando dados de exemplo..."
    
    npm run seed
    if [ $? -eq 0 ]; then
        log_success "Dados de exemplo criados"
    else
        log_warning "Erro ao criar dados de exemplo (pode ser normal se já existirem)"
    fi
}

# Testar API
test_api() {
    log_info "Testando API..."
    
    # Iniciar servidor em background
    npm start &
    API_PID=$!
    
    # Aguardar servidor iniciar
    sleep 5
    
    # Testar health check
    if curl -s http://localhost:3001/health > /dev/null; then
        log_success "API respondendo corretamente"
    else
        log_error "API não está respondendo"
        kill $API_PID 2>/dev/null
        exit 1
    fi
    
    # Parar servidor
    kill $API_PID 2>/dev/null
    wait $API_PID 2>/dev/null
}

# Criar scripts auxiliares
create_scripts() {
    log_info "Criando scripts auxiliares..."
    
    # Script de start
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Iniciando API da Urna Eletrônica..."
npm start
EOF
    chmod +x start.sh
    
    # Script de desenvolvimento
    cat > dev.sh << 'EOF'
#!/bin/bash
echo "🔧 Iniciando em modo desenvolvimento..."
npm run dev
EOF
    chmod +x dev.sh
    
    # Script de teste
    cat > test.sh << 'EOF'
#!/bin/bash
echo "🧪 Executando testes..."
npm test
EOF
    chmod +x test.sh
    
    log_success "Scripts auxiliares criados"
}

# Configurar Git hooks
setup_git_hooks() {
    log_info "Configurando Git hooks..."
    
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🧪 Executando testes antes do commit..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Testes falharam. Commit cancelado."
    exit 1
fi
EOF
    chmod +x .git/hooks/pre-commit
    
    log_success "Git hooks configurados"
}

# Criar documentação
create_docs() {
    log_info "Criando documentação..."
    
    cat > QUICK_START.md << 'EOF'
# 🚀 Quick Start - Urna Eletrônica

## Iniciar a API
```bash
./start.sh
# ou
npm start
```

## Desenvolvimento
```bash
./dev.sh
# ou
npm run dev
```

## Credenciais padrão
- Email: admin@urna.com
- Senha: admin123

## URLs importantes
- API: http://localhost:3001
- Health: http://localhost:3001/health
- Docs: http://localhost:3001/api/docs

## Testes
```bash
./test.sh
# ou
npm test
```

## Próximos passos
1. Configure o ESP32 com o código em docs/ESP32_CONFIG.md
2. Configure o tablet seguindo docs/TABLET_CONFIG.md
3. Configure o dashboard conforme docs/DEPLOY_GUIDE.md
EOF

    log_success "Documentação criada"
}

# Função principal
main() {
    echo ""
    log_info "Iniciando instalação completa..."
    echo ""
    
    check_requirements
    setup_environment
    install_dependencies
    setup_database
    seed_data
    test_api
    create_scripts
    setup_git_hooks
    create_docs
    
    echo ""
    echo "🎉 ========================================"
    echo "   INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "========================================"
    echo ""
    log_success "Sistema pronto para uso!"
    echo ""
    echo "📋 PRÓXIMOS PASSOS:"
    echo ""
    echo "1. 🚀 Iniciar a API:"
    echo "   ./start.sh"
    echo ""
    echo "2. 🔐 Fazer login:"
    echo "   Email: admin@urna.com"
    echo "   Senha: admin123"
    echo ""
    echo "3. 🌐 Acessar:"
    echo "   API: http://localhost:3001"
    echo "   Health: http://localhost:3001/health"
    echo "   Docs: http://localhost:3001/api/docs"
    echo ""
    echo "4. 📚 Documentação completa:"
    echo "   README.md - Manual completo"
    echo "   QUICK_START.md - Guia rápido"
    echo "   docs/ - Documentação técnica"
    echo ""
    echo "5. 🔧 Configurar hardware:"
    echo "   docs/ESP32_CONFIG.md"
    echo ""
    echo "6. 📱 Configurar interfaces:"
    echo "   docs/TABLET_CONFIG.md"
    echo ""
    echo "7. 🚀 Deploy em produção:"
    echo "   docs/DEPLOY_GUIDE.md"
    echo ""
    log_success "Instalação finalizada! 🗳️"
    echo ""
}

# Executar instalação
main "$@"
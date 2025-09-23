@echo off
title Instalador Urna Eletronica Digital

echo.
echo ========================================
echo   INSTALADOR URNA ELETRONICA DIGITAL
echo ========================================
echo.

REM Verificar Node.js
echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js 18+ primeiro.
    pause
    exit /b 1
)

REM Verificar versão do Node.js
for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% lss 18 (
    echo [ERRO] Node.js 18+ e necessario. Versao atual: 
    node --version
    pause
    exit /b 1
)

echo [OK] Node.js encontrado

REM Verificar Git
echo [INFO] Verificando Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado. Instale Git primeiro.
    pause
    exit /b 1
)
echo [OK] Git encontrado

REM Configurar variáveis de ambiente
echo.
echo ========================================
echo   CONFIGURACAO DE AMBIENTE
echo ========================================
echo.
echo Voce precisara de:
echo 1. URL do projeto Supabase
echo 2. Chave anon do Supabase
echo 3. Chave service_role do Supabase
echo.

set /p SUPABASE_URL="URL do Supabase (https://xxx.supabase.co): "
set /p SUPABASE_ANON_KEY="Chave anon do Supabase: "
set /p SUPABASE_SERVICE_ROLE_KEY="Chave service_role do Supabase: "

REM Criar arquivo .env
echo [INFO] Criando arquivo .env...
(
echo # Configuracoes do servidor
echo NODE_ENV=development
echo PORT=3001
echo.
echo # Configuracoes do Supabase
echo SUPABASE_URL=%SUPABASE_URL%
echo SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY%
echo.
echo # Configuracoes de JWT
echo JWT_SECRET=SUA_CHAVE_SECRETA_MUITO_FORTE_AQUI_32_CARACTERES_MINIMO
echo JWT_EXPIRES_IN=24h
echo.
echo # Configuracoes de CORS
echo CORS_ORIGIN=http://localhost:3000,http://localhost:3001
echo.
echo # Configuracoes de Rate Limiting
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo.
echo # Configuracoes de Log
echo LOG_LEVEL=info
echo.
echo # Configuracoes ESP32
echo ESP32_TIMEOUT=5000
echo ESP32_DEFAULT_IP=192.168.1.100
) > .env

echo [OK] Arquivo .env criado

REM Instalar dependências
echo.
echo [INFO] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha na instalacao das dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas

REM Inicializar banco de dados
echo.
echo [INFO] Inicializando banco de dados...
call npm run init-db
if %errorlevel% neq 0 (
    echo [ERRO] Falha na inicializacao do banco
    pause
    exit /b 1
)
echo [OK] Banco de dados inicializado

REM Criar dados de exemplo
echo.
echo [INFO] Criando dados de exemplo...
call npm run seed
echo [OK] Dados de exemplo criados

REM Criar scripts auxiliares
echo.
echo [INFO] Criando scripts auxiliares...

echo @echo off > start.bat
echo echo Iniciando API da Urna Eletronica... >> start.bat
echo call npm start >> start.bat

echo @echo off > dev.bat
echo echo Iniciando em modo desenvolvimento... >> dev.bat
echo call npm run dev >> dev.bat

echo @echo off > test.bat
echo echo Executando testes... >> test.bat
echo call npm test >> test.bat

echo [OK] Scripts auxiliares criados

REM Testar API
echo.
echo [INFO] Testando API...
start /b npm start
timeout /t 5 /nobreak >nul
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API respondendo corretamente
) else (
    echo [AVISO] API pode nao estar respondendo ainda
)

REM Finalizar
echo.
echo ========================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo [OK] Sistema pronto para uso!
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. Iniciar a API:
echo    start.bat
echo.
echo 2. Fazer login:
echo    Email: admin@urna.com
echo    Senha: admin123
echo.
echo 3. Acessar:
echo    API: http://localhost:3001
echo    Health: http://localhost:3001/health
echo    Docs: http://localhost:3001/api/docs
echo.
echo 4. Documentacao completa:
echo    README.md - Manual completo
echo    docs\ - Documentacao tecnica
echo.
echo 5. Configurar hardware:
echo    docs\ESP32_CONFIG.md
echo.
echo 6. Deploy em producao:
echo    docs\DEPLOY_GUIDE.md
echo.
echo Instalacao finalizada!
echo.
pause
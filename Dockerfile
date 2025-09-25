# Usar imagem base do Ubuntu com Node.js instalado manualmente
FROM ubuntu:20.04

# Configurar timezone para evitar prompts interativos
ENV TZ=America/Sao_Paulo
ENV DEBIAN_FRONTEND=noninteractive

# Instalar Node.js e dependências
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    python3-pip \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs uploads/candidatos uploads/temp

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Alterar proprietário dos arquivos
RUN chown -R nextjs:nodejs /app

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3001

# Comando de inicialização
CMD ["npm", "start"]
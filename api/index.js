require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importações dos módulos locais
const logger = require('./utils/logger');
const supabase = require('./config/supabase');

// Importação das rotas
const routes = require('./routes');

// Middlewares globais
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Configuração de rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por janela
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.',
    status: 'error'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares de segurança e configuração
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Aplicar rate limiting apenas em produção
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// Middleware para disponibilizar o io em todas as rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🗳️ API da Urna Eletrônica',
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas da API
app.use('/api', routes);

// Middleware de tratamento de erros
app.use(notFound);
app.use(errorHandler);

// Configuração do Socket.IO para tempo real
io.on('connection', (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);
  
  socket.on('join-election', (eleicaoId) => {
    socket.join(`eleicao-${eleicaoId}`);
    logger.info(`Cliente ${socket.id} entrou na sala da eleição ${eleicaoId}`);
  });
  
  socket.on('leave-election', (eleicaoId) => {
    socket.leave(`eleicao-${eleicaoId}`);
    logger.info(`Cliente ${socket.id} saiu da sala da eleição ${eleicaoId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// Função para emitir atualizações em tempo real
const emitRealTimeUpdate = (eleicaoId, data) => {
  io.to(`eleicao-${eleicaoId}`).emit('election-update', data);
};

// Disponibilizar função globalmente
global.emitRealTimeUpdate = emitRealTimeUpdate;

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = app;
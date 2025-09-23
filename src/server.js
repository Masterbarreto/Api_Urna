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
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const urnasRoutes = require('./routes/urnas');
const eleicoesRoutes = require('./routes/eleicoes');
const candidatosRoutes = require('./routes/candidatos');
const eleitoresRoutes = require('./routes/eleitores');
const resultadosRoutes = require('./routes/resultados');
const auditoriaRoutes = require('./routes/auditoria');
const urnaVotacaoRoutes = require('./routes/urnaVotacao');

// Middlewares globais
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000"],
    methods: ["GET", "POST"]
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
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000"],
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Middleware para disponibilizar o io em todas as rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rotas da API
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas de monitoramento e administração
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/urnas', urnasRoutes);
app.use('/api/v1/eleicoes', eleicoesRoutes);
app.use('/api/v1/candidatos', candidatosRoutes);
app.use('/api/v1/eleitores', eleitoresRoutes);
app.use('/api/v1/resultados', resultadosRoutes);
app.use('/api/v1/auditoria', auditoriaRoutes);

// Rotas específicas da urna de votação
app.use('/api', urnaVotacaoRoutes);

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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 Servidor da API Urna Eletrônica rodando na porta ${PORT}`);
  logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server, io };
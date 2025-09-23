const logger = require('../utils/logger');

// Configurar eventos de Socket.IO para tempo real
const configurarSocketIO = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Cliente conectado: ${socket.id}`);

    // Evento para cliente entrar em uma sala de eleição específica
    socket.on('join-election', (eleicaoId) => {
      socket.join(`eleicao-${eleicaoId}`);
      logger.info(`Cliente ${socket.id} entrou na sala da eleição ${eleicaoId}`);
      
      // Confirmar entrada na sala
      socket.emit('joined-election', {
        eleicaoId,
        message: 'Conectado ao monitoramento em tempo real'
      });
    });

    // Evento para cliente sair de uma sala de eleição
    socket.on('leave-election', (eleicaoId) => {
      socket.leave(`eleicao-${eleicaoId}`);
      logger.info(`Cliente ${socket.id} saiu da sala da eleição ${eleicaoId}`);
    });

    // Evento para cliente solicitar status atual
    socket.on('get-election-status', (eleicaoId) => {
      // Aqui você pode buscar o status atual da eleição e enviar de volta
      socket.emit('election-status', {
        eleicaoId,
        timestamp: new Date().toISOString(),
        message: 'Status solicitado'
      });
    });

    // Evento de ping para manter conexão viva
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString()
      });
    });

    // Evento de desconexão
    socket.on('disconnect', (reason) => {
      logger.info(`Cliente desconectado: ${socket.id}, Motivo: ${reason}`);
    });

    // Evento para reportar erro do cliente
    socket.on('client-error', (error) => {
      logger.error(`Erro reportado pelo cliente ${socket.id}:`, error);
    });
  });

  return io;
};

// Função para emitir atualização de voto em tempo real
const emitirAtualizacaoVoto = (io, eleicaoId, dadosVoto) => {
  io.to(`eleicao-${eleicaoId}`).emit('vote-update', {
    type: 'new-vote',
    eleicaoId,
    timestamp: new Date().toISOString(),
    data: dadosVoto
  });
  
  logger.info(`Atualização de voto emitida para eleição ${eleicaoId}`);
};

// Função para emitir atualização de resultados
const emitirAtualizacaoResultados = (io, eleicaoId, resultados) => {
  io.to(`eleicao-${eleicaoId}`).emit('results-update', {
    type: 'results-changed',
    eleicaoId,
    timestamp: new Date().toISOString(),
    data: resultados
  });
  
  logger.info(`Atualização de resultados emitida para eleição ${eleicaoId}`);
};

// Função para emitir status de urna
const emitirStatusUrna = (io, urnaId, status) => {
  io.emit('urna-status', {
    type: 'urna-status-changed',
    urnaId,
    status,
    timestamp: new Date().toISOString()
  });
  
  logger.info(`Status de urna emitido: ${urnaId} - ${status}`);
};

// Função para emitir alerta de sistema
const emitirAlerta = (io, eleicaoId, alerta) => {
  const evento = eleicaoId ? `eleicao-${eleicaoId}` : io;
  
  if (eleicaoId) {
    io.to(evento).emit('system-alert', {
      type: 'alert',
      eleicaoId,
      alert: alerta,
      timestamp: new Date().toISOString()
    });
  } else {
    io.emit('system-alert', {
      type: 'global-alert',
      alert: alerta,
      timestamp: new Date().toISOString()
    });
  }
  
  logger.info(`Alerta emitido: ${alerta.message}`);
};

// Função para obter estatísticas de conexões
const obterEstatisticasConexoes = (io) => {
  const sockets = io.sockets.sockets;
  const salas = {};
  
  // Contar clientes por sala
  sockets.forEach(socket => {
    socket.rooms.forEach(room => {
      if (room.startsWith('eleicao-')) {
        salas[room] = (salas[room] || 0) + 1;
      }
    });
  });
  
  return {
    totalClientes: sockets.size,
    clientesPorEleicao: salas,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  configurarSocketIO,
  emitirAtualizacaoVoto,
  emitirAtualizacaoResultados,
  emitirStatusUrna,
  emitirAlerta,
  obterEstatisticasConexoes
};
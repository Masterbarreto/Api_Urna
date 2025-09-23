const logger = require('../utils/logger');

// Middleware para tratar erros globais
const errorHandler = (error, req, res, next) => {
  logger.error('Erro capturado pelo middleware:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Erro de validação do Joi
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'erro',
      message: 'Dados inválidos',
      details: error.details?.map(detail => detail.message) || [error.message],
      timestamp: new Date().toISOString()
    });
  }

  // Erro de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'erro',
      message: 'Token inválido',
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'erro',
      message: 'Token expirado',
      timestamp: new Date().toISOString()
    });
  }

  // Erro do Supabase
  if (error.code) {
    const statusCode = getSupabaseErrorStatus(error.code);
    return res.status(statusCode).json({
      status: 'erro',
      message: getSupabaseErrorMessage(error.code, error.message),
      timestamp: new Date().toISOString()
    });
  }

  // Erro de rede/conexão
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      status: 'erro',
      message: 'Serviço temporariamente indisponível',
      timestamp: new Date().toISOString()
    });
  }

  // Erro padrão
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erro interno do servidor';

  // Em produção, não expor detalhes do erro
  const response = {
    status: 'erro',
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Erro interno do servidor' 
      : message,
    timestamp: new Date().toISOString()
  };

  // Adicionar stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// Mapear códigos de erro do Supabase para status HTTP
const getSupabaseErrorStatus = (code) => {
  const errorMap = {
    '23505': 409, // unique_violation
    '23503': 400, // foreign_key_violation
    '23502': 400, // not_null_violation
    '23514': 400, // check_violation
    'PGRST116': 404, // not_found
    '42P01': 500, // undefined_table
    '42703': 500, // undefined_column
  };

  return errorMap[code] || 500;
};

// Converter códigos de erro do Supabase em mensagens amigáveis
const getSupabaseErrorMessage = (code, originalMessage) => {
  const messageMap = {
    '23505': 'Já existe um registro com estes dados',
    '23503': 'Referência inválida a outro registro',
    '23502': 'Campo obrigatório não preenchido',
    '23514': 'Dados não atendem às regras de validação',
    'PGRST116': 'Registro não encontrado',
  };

  return messageMap[code] || originalMessage || 'Erro no banco de dados';
};

module.exports = errorHandler;
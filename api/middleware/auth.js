const { verifyToken, errorResponse } = require('../utils/helpers');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// Middleware de autenticação JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return errorResponse(res, 'Token de acesso não fornecido', 401);
    }

    // Verificar o token JWT
    const decoded = verifyToken(token);
    
    // Buscar o usuário no banco de dados
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, ativo')
      .eq('id', decoded.userId)
      .eq('ativo', true)
      .single();

    if (error || !user) {
      return errorResponse(res, 'Token inválido ou usuário não encontrado', 401);
    }

    // Adicionar informações do usuário na requisição
    req.user = user;
    next();

  } catch (error) {
    logger.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Token inválido', 401);
    } else if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expirado', 401);
    }
    
    return errorResponse(res, 'Erro na autenticação', 500);
  }
};

// Middleware para verificar se o usuário é admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Acesso negado: usuário não autenticado', 401);
  }

  if (req.user.tipo !== 'admin') {
    return errorResponse(res, 'Acesso negado: permissões de administrador necessárias', 403);
  }

  next();
};

// Middleware para verificar se o usuário é admin ou operador
const requireOperator = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Acesso negado: usuário não autenticado', 401);
  }

  if (!['admin', 'operador'].includes(req.user.tipo)) {
    return errorResponse(res, 'Acesso negado: permissões insuficientes', 403);
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOperator
};
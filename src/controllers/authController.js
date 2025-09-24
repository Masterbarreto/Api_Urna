const { supabase } = require('../../api/config/supabase');
const { 
  verifyPassword, 
  generateToken, 
  successResponse, 
  errorResponse 
} = require('../utils/helpers');
const logger = require('../utils/logger');

// Controller para login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário no banco de dados
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha_hash, tipo, ativo')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return errorResponse(res, 'Email ou senha incorretos', 401);
    }

    // Verificar se o usuário está ativo
    if (!user.ativo) {
      return errorResponse(res, 'Usuário inativo. Contate o administrador', 401);
    }

    // Verificar senha
    const senhaValida = await verifyPassword(senha, user.senha_hash);
    if (!senhaValida) {
      return errorResponse(res, 'Email ou senha incorretos', 401);
    }

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tipo: user.tipo
    });

    // Atualizar último login
    await supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log de auditoria
    await supabase
      .from('logs_auditoria')
      .insert({
        usuario_id: user.id,
        acao: 'LOGIN',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    logger.info(`Login realizado com sucesso para usuário: ${user.email}`);

    // Remover senha hash da resposta
    const { senha_hash, ...userResponse } = user;

    return successResponse(res, {
      user: userResponse,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }, 'Login realizado com sucesso');

  } catch (error) {
    logger.error('Erro no login:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter dados do usuário logado
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados atualizados do usuário
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, ativo, ultimo_login, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    if (!user.ativo) {
      return errorResponse(res, 'Usuário inativo', 401);
    }

    return successResponse(res, user, 'Dados do usuário obtidos com sucesso');

  } catch (error) {
    logger.error('Erro ao obter dados do usuário:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para logout (opcional - pode ser usado para invalidar token no frontend)
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Log de auditoria
    await supabase
      .from('logs_auditoria')
      .insert({
        usuario_id: userId,
        acao: 'LOGOUT',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    logger.info(`Logout realizado para usuário: ${req.user.email}`);

    return successResponse(res, null, 'Logout realizado com sucesso');

  } catch (error) {
    logger.error('Erro no logout:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para refresh token (opcional)
const refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar se o usuário ainda está ativo
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, email, tipo, ativo')
      .eq('id', userId)
      .single();

    if (error || !user || !user.ativo) {
      return errorResponse(res, 'Usuário não encontrado ou inativo', 401);
    }

    // Gerar novo token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      tipo: user.tipo
    });

    return successResponse(res, {
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }, 'Token atualizado com sucesso');

  } catch (error) {
    logger.error('Erro ao atualizar token:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  login,
  getMe,
  logout,
  refreshToken
};
const { supabase } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Controller para listar todas as eleições
const listarEleicoes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('eleicoes')
      .select(`
        id,
        titulo,
        descricao,
        data_inicio,
        data_fim,
        status,
        total_votos,
        total_eleitores,
        created_at,
        updated_at
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('titulo', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: eleicoes, error, count } = await query;

    if (error) throw error;

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };

    return successResponse(res, { eleicoes, pagination }, 'Eleições listadas com sucesso');

  } catch (error) {
    logger.error('Erro ao listar eleições:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter uma eleição específica
const obterEleicao = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: eleicao, error } = await supabase
      .from('eleicoes')
      .select(`
        id,
        titulo,
        descricao,
        data_inicio,
        data_fim,
        status,
        total_votos,
        total_eleitores,
        created_at,
        updated_at,
        candidatos(id, numero, nome, partido, total_votos)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Eleição não encontrada', 404);
      }
      throw error;
    }

    return successResponse(res, eleicao, 'Eleição obtida com sucesso');

  } catch (error) {
    logger.error('Erro ao obter eleição:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para criar uma nova eleição
const criarEleicao = async (req, res) => {
  try {
    const { titulo, descricao, data_inicio, data_fim, status = 'criada' } = req.body;

    const { data: eleicao, error } = await supabase
      .from('eleicoes')
      .insert({
        titulo,
        descricao,
        data_inicio,
        data_fim,
        status
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Eleição criada com sucesso - ID: ${eleicao.id}, Título: ${titulo}`);

    return successResponse(res, eleicao, 'Eleição criada com sucesso', 201);

  } catch (error) {
    logger.error('Erro ao criar eleição:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para atualizar uma eleição
const atualizarEleicao = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, data_inicio, data_fim, status } = req.body;

    const { data: eleicao, error } = await supabase
      .from('eleicoes')
      .update({
        titulo,
        descricao,
        data_inicio,
        data_fim,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Eleição não encontrada', 404);
      }
      throw error;
    }

    logger.info(`Eleição atualizada com sucesso - ID: ${id}`);

    return successResponse(res, eleicao, 'Eleição atualizada com sucesso');

  } catch (error) {
    logger.error('Erro ao atualizar eleição:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para excluir uma eleição
const excluirEleicao = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a eleição tem votos associados
    const { data: votosAssociados } = await supabase
      .from('votos')
      .select('id')
      .eq('eleicao_id', id)
      .limit(1);

    if (votosAssociados && votosAssociados.length > 0) {
      return errorResponse(res, 'Não é possível excluir eleição que possui votos registrados', 409);
    }

    const { error } = await supabase
      .from('eleicoes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Eleição excluída com sucesso - ID: ${id}`);

    return successResponse(res, null, 'Eleição excluída com sucesso');

  } catch (error) {
    logger.error('Erro ao excluir eleição:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  listarEleicoes,
  obterEleicao,
  criarEleicao,
  atualizarEleicao,
  excluirEleicao
};
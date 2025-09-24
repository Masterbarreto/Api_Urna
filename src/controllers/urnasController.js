const { supabase } = require('../../api/config/supabase');
const { 
  successResponse, 
  errorResponse,
  isValidUUID
} = require('../utils/helpers');
const logger = require('../utils/logger');

// Controller para listar todas as urnas
const listarUrnas = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('urnas')
      .select(`
        id,
        numero,
        localizacao,
        status,
        ip_address,
        ultimo_ping,
        total_votos,
        created_at,
        updated_at,
        eleicoes(titulo)
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`numero.ilike.%${search}%,localizacao.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1).order('numero');

    const { data: urnas, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calcular status de conexão
    const agora = new Date();
    const urnasComStatus = urnas?.map(urna => {
      let statusConexao = 'offline';
      
      if (urna.ultimo_ping) {
        const ultimoPing = new Date(urna.ultimo_ping);
        const diferencaMinutos = (agora - ultimoPing) / (1000 * 60);
        
        if (diferencaMinutos <= 5 && urna.status === 'ativa') {
          statusConexao = 'online';
        } else if (diferencaMinutos <= 15) {
          statusConexao = 'warning';
        }
      }

      return {
        ...urna,
        statusConexao
      };
    }) || [];

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };

    return successResponse(res, {
      urnas: urnasComStatus,
      pagination
    }, 'Urnas listadas com sucesso');

  } catch (error) {
    logger.error('Erro ao listar urnas:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter uma urna específica
const obterUrna = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: urna, error } = await supabase
      .from('urnas')
      .select(`
        id,
        numero,
        localizacao,
        status,
        ip_address,
        ultimo_ping,
        total_votos,
        created_at,
        updated_at,
        eleicoes(id, titulo, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Urna não encontrada', 404);
      }
      throw error;
    }

    return successResponse(res, urna, 'Urna obtida com sucesso');

  } catch (error) {
    logger.error('Erro ao obter urna:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para criar uma nova urna
const criarUrna = async (req, res) => {
  try {
    const { numero, localizacao, status = 'ativa', ip_address } = req.body;

    // Verificar se o número da urna já existe
    const { data: urnaExistente } = await supabase
      .from('urnas')
      .select('id')
      .eq('numero', numero)
      .single();

    if (urnaExistente) {
      return errorResponse(res, 'Já existe uma urna com este número', 409);
    }

    const { data: urna, error } = await supabase
      .from('urnas')
      .insert({
        numero,
        localizacao,
        status,
        ip_address: ip_address || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`Urna criada com sucesso - ID: ${urna.id}, Número: ${numero}`);

    return successResponse(res, urna, 'Urna criada com sucesso', 201);

  } catch (error) {
    logger.error('Erro ao criar urna:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para atualizar uma urna
const atualizarUrna = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, localizacao, status, ip_address } = req.body;

    // Verificar se a urna existe
    const { data: urnaExistente, error: erroExistente } = await supabase
      .from('urnas')
      .select('id, numero')
      .eq('id', id)
      .single();

    if (erroExistente || !urnaExistente) {
      return errorResponse(res, 'Urna não encontrada', 404);
    }

    // Verificar se o novo número já existe (se foi alterado)
    if (numero && numero !== urnaExistente.numero) {
      const { data: numeroExistente } = await supabase
        .from('urnas')
        .select('id')
        .eq('numero', numero)
        .neq('id', id)
        .single();

      if (numeroExistente) {
        return errorResponse(res, 'Já existe uma urna com este número', 409);
      }
    }

    const { data: urna, error } = await supabase
      .from('urnas')
      .update({
        numero,
        localizacao,
        status,
        ip_address
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`Urna atualizada com sucesso - ID: ${id}`);

    return successResponse(res, urna, 'Urna atualizada com sucesso');

  } catch (error) {
    logger.error('Erro ao atualizar urna:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para excluir uma urna
const excluirUrna = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a urna tem votos associados
    const { data: votosAssociados } = await supabase
      .from('votos')
      .select('id')
      .eq('urna_id', id)
      .limit(1);

    if (votosAssociados && votosAssociados.length > 0) {
      return errorResponse(res, 'Não é possível excluir urna que possui votos registrados', 409);
    }

    const { error } = await supabase
      .from('urnas')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    logger.info(`Urna excluída com sucesso - ID: ${id}`);

    return successResponse(res, null, 'Urna excluída com sucesso');

  } catch (error) {
    logger.error('Erro ao excluir urna:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para atualizar ping de uma urna (usado pelo ESP32)
const atualizarPing = async (req, res) => {
  try {
    const { numero } = req.params;

    const { data: urna, error } = await supabase
      .from('urnas')
      .update({ ultimo_ping: new Date().toISOString() })
      .eq('numero', numero)
      .select('id, numero, localizacao')
      .single();

    if (error || !urna) {
      return errorResponse(res, 'Urna não encontrada', 404);
    }

    return successResponse(res, urna, 'Ping atualizado com sucesso');

  } catch (error) {
    logger.error('Erro ao atualizar ping da urna:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  listarUrnas,
  obterUrna,
  criarUrna,
  atualizarUrna,
  excluirUrna,
  atualizarPing
};
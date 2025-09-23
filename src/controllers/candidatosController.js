const { supabase } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Controller para listar todos os candidatos
const listarCandidatos = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, eleicao_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('candidatos')
      .select(`
        id,
        numero,
        nome,
        partido,
        foto_url,
        total_votos,
        created_at,
        updated_at,
        eleicoes(titulo, status)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,partido.ilike.%${search}%,numero.ilike.%${search}%`);
    }

    if (eleicao_id) {
      query = query.eq('eleicao_id', eleicao_id);
    }

    query = query.range(offset, offset + limit - 1).order('numero');

    const { data: candidatos, error, count } = await query;

    if (error) throw error;

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };

    return successResponse(res, { candidatos, pagination }, 'Candidatos listados com sucesso');

  } catch (error) {
    logger.error('Erro ao listar candidatos:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter um candidato específico
const obterCandidato = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: candidato, error } = await supabase
      .from('candidatos')
      .select(`
        id,
        numero,
        nome,
        partido,
        foto_url,
        total_votos,
        created_at,
        updated_at,
        eleicoes(id, titulo, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Candidato não encontrado', 404);
      }
      throw error;
    }

    return successResponse(res, candidato, 'Candidato obtido com sucesso');

  } catch (error) {
    logger.error('Erro ao obter candidato:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para criar um novo candidato
const criarCandidato = async (req, res) => {
  try {
    const { numero, nome, partido, eleicao_id } = req.body;
    
    // Verificar se o número do candidato já existe na eleição
    const { data: candidatoExistente } = await supabase
      .from('candidatos')
      .select('id')
      .eq('numero', numero)
      .eq('eleicao_id', eleicao_id)
      .single();

    if (candidatoExistente) {
      // Se há arquivo enviado, removê-lo
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Já existe um candidato com este número nesta eleição', 409);
    }

    // Verificar se a eleição existe
    const { data: eleicao, error: eleicaoError } = await supabase
      .from('eleicoes')
      .select('id')
      .eq('id', eleicao_id)
      .single();

    if (eleicaoError || !eleicao) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Eleição não encontrada', 404);
    }

    // Construir URL da foto se foi enviada
    let foto_url = null;
    if (req.file) {
      foto_url = `/uploads/candidatos/${req.file.filename}`;
    }

    const { data: candidato, error } = await supabase
      .from('candidatos')
      .insert({
        numero,
        nome,
        partido,
        eleicao_id,
        foto_url
      })
      .select()
      .single();

    if (error) {
      // Se erro ao inserir no banco, remover arquivo enviado
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      throw error;
    }

    logger.info(`Candidato criado com sucesso - ID: ${candidato.id}, Número: ${numero}`);

    return successResponse(res, candidato, 'Candidato criado com sucesso', 201);

  } catch (error) {
    // Limpar arquivo se houve erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error('Erro ao remover arquivo:', unlinkError);
      }
    }

    logger.error('Erro ao criar candidato:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para atualizar um candidato
const atualizarCandidato = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, nome, partido, eleicao_id } = req.body;

    // Verificar se o candidato existe
    const { data: candidatoExistente, error: erroExistente } = await supabase
      .from('candidatos')
      .select('id, numero, eleicao_id, foto_url')
      .eq('id', id)
      .single();

    if (erroExistente || !candidatoExistente) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Candidato não encontrado', 404);
    }

    // Verificar se o novo número já existe (se foi alterado)
    if (numero && (numero !== candidatoExistente.numero || eleicao_id !== candidatoExistente.eleicao_id)) {
      const { data: numeroExistente } = await supabase
        .from('candidatos')
        .select('id')
        .eq('numero', numero)
        .eq('eleicao_id', eleicao_id || candidatoExistente.eleicao_id)
        .neq('id', id)
        .single();

      if (numeroExistente) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return errorResponse(res, 'Já existe um candidato com este número nesta eleição', 409);
      }
    }

    // Construir dados de atualização
    const dadosAtualizacao = {
      numero,
      nome,
      partido,
      eleicao_id
    };

    // Se nova foto foi enviada
    if (req.file) {
      // Remover foto anterior se existir
      if (candidatoExistente.foto_url) {
        const fotoAnterior = path.join(__dirname, '../../', candidatoExistente.foto_url);
        if (fs.existsSync(fotoAnterior)) {
          fs.unlinkSync(fotoAnterior);
        }
      }
      dadosAtualizacao.foto_url = `/uploads/candidatos/${req.file.filename}`;
    }

    const { data: candidato, error } = await supabase
      .from('candidatos')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      throw error;
    }

    logger.info(`Candidato atualizado com sucesso - ID: ${id}`);

    return successResponse(res, candidato, 'Candidato atualizado com sucesso');

  } catch (error) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error('Erro ao remover arquivo:', unlinkError);
      }
    }

    logger.error('Erro ao atualizar candidato:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para excluir um candidato
const excluirCandidato = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar candidato para obter caminho da foto
    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('foto_url')
      .eq('id', id)
      .single();

    if (candidatoError || !candidato) {
      return errorResponse(res, 'Candidato não encontrado', 404);
    }

    // Verificar se o candidato tem votos associados
    const { data: votosAssociados } = await supabase
      .from('votos')
      .select('id')
      .eq('candidato_id', id)
      .limit(1);

    if (votosAssociados && votosAssociados.length > 0) {
      return errorResponse(res, 'Não é possível excluir candidato que possui votos registrados', 409);
    }

    const { error } = await supabase
      .from('candidatos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remover foto se existir
    if (candidato.foto_url) {
      const caminhoFoto = path.join(__dirname, '../../', candidato.foto_url);
      if (fs.existsSync(caminhoFoto)) {
        fs.unlinkSync(caminhoFoto);
      }
    }

    logger.info(`Candidato excluído com sucesso - ID: ${id}`);

    return successResponse(res, null, 'Candidato excluído com sucesso');

  } catch (error) {
    logger.error('Erro ao excluir candidato:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  listarCandidatos,
  obterCandidato,
  criarCandidato,
  atualizarCandidato,
  excluirCandidato
};
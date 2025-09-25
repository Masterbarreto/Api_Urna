const { supabase } = require('../../api/config/supabase');
const { 
  successResponse, 
  errorResponse,
  generateAuditCode
} = require('../utils/helpers');
const logger = require('../utils/logger');
const axios = require('axios');

// Controller para validar eleitor
const validarEleitor = async (req, res) => {
  try {
    const { matricula } = req.body;

    // Buscar eleitor no banco de dados
    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .select(`
        id,
        matricula,
        nome,
        ja_votou,
        data_voto,
        eleicoes!inner(
          id,
          titulo,
          status,
          data_inicio,
          data_fim
        )
      `)
      .eq('matricula', matricula)
      .single();

    if (error || !eleitor) {
      logger.warn(`Tentativa de validação com matrícula inexistente: ${matricula}`);
      return errorResponse(res, 'Matrícula não encontrada.', 404);
    }

    // Verificar se a eleição está ativa
    const eleicao = eleitor.eleicoes;
    const agora = new Date();
    const dataInicio = new Date(eleicao.data_inicio);
    const dataFim = new Date(eleicao.data_fim);

    if (eleicao.status !== 'ativa' || agora < dataInicio || agora > dataFim) {
      return errorResponse(res, 'Eleição não está ativa no momento.', 409);
    }

    // Verificar se o eleitor já votou
    if (eleitor.ja_votou) {
      logger.warn(`Tentativa de voto duplicado - Matrícula: ${matricula}`);
      return errorResponse(res, 'Este eleitor já votou.', 409);
    }

    // Log de auditoria
    await supabase
      .from('logs_auditoria')
      .insert({
        acao: 'VALIDACAO_ELEITOR',
        tabela_afetada: 'eleitores',
        registro_id: eleitor.id,
        dados_novos: { matricula, resultado: 'sucesso' },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    logger.info(`Eleitor validado com sucesso - Matrícula: ${matricula}`);

    return successResponse(res, {
      eleitor: {
        nome: eleitor.nome,
        matricula: eleitor.matricula
      },
      eleicao: {
        titulo: eleicao.titulo,
        id: eleicao.id
      }
    }, 'Eleitor apto para votar.');

  } catch (error) {
    logger.error('Erro na validação do eleitor:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter candidatos da eleição ativa
const getCandidatos = async (req, res) => {
  try {
    // Permitir eleicao_id via query parameter ou buscar eleição ativa
    let eleicaoId = req.query.eleicao_id;
    
    if (!eleicaoId) {
      // Buscar eleição ativa
      const { data: eleicaoAtiva, error: eleicaoError } = await supabase
        .from('eleicoes')
        .select('id')
        .eq('status', 'ativa')
        .single();

      if (eleicaoError || !eleicaoAtiva) {
        return errorResponse(res, 'Nenhuma eleição ativa encontrada', 404);
      }
      
      eleicaoId = eleicaoAtiva.id;
    }

    // Buscar candidatos da eleição
    const { data: candidatos, error } = await supabase
      .from('candidatos')
      .select('id, numero, nome, partido, foto_url')
      .eq('eleicao_id', eleicaoId)
      .order('numero');

    if (error) {
      throw error;
    }

    logger.info(`Lista de candidatos solicitada - Eleição: ${eleicaoId}`);

    return successResponse(res, candidatos, 'Candidatos obtidos com sucesso');

  } catch (error) {
    logger.error('Erro ao obter candidatos:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para registrar voto
const registrarVoto = async (req, res) => {
  try {
    // Aceitar tanto o formato novo quanto o antigo
    const candidatoId = req.body.candidato_id || req.body.idCandidato;
    const eleitorMatricula = req.body.eleitor_matricula || req.body.eleitorMatricula || req.session?.eleitorMatricula;
    const eleicaoId = req.body.eleicao_id || req.body.eleicao_id;
    
    if (!eleitorMatricula) {
      return errorResponse(res, 'Matrícula do eleitor é obrigatória', 400);
    }
    
    if (!candidatoId) {
      return errorResponse(res, 'ID do candidato é obrigatório', 400);
    }

    // Buscar dados do eleitor e eleição
    const { data: eleitor, error: eleitorError } = await supabase
      .from('eleitores')
      .select(`
        id,
        matricula,
        ja_votou,
        eleicao_id,
        eleicoes!inner(
          id,
          status,
          data_inicio,
          data_fim
        )
      `)
      .eq('matricula', eleitorMatricula)
      .single();

    if (eleitorError || !eleitor) {
      return errorResponse(res, 'Eleitor não encontrado', 404);
    }

    if (eleitor.ja_votou) {
      return errorResponse(res, 'Este eleitor já votou.', 409);
    }

    // Verificar se a eleição está ativa
    const eleicao = eleitor.eleicoes;
    const agora = new Date();
    const dataInicio = new Date(eleicao.data_inicio);
    const dataFim = new Date(eleicao.data_fim);

    if (eleicao.status !== 'ativa' || agora < dataInicio || agora > dataFim) {
      return errorResponse(res, 'Eleição não está ativa no momento.', 409);
    }

    // Preparar dados do voto
    let tipoVoto = 'candidato';
    let candidatoIdFinal = null;

    if (candidatoId === 'NULO') {
      tipoVoto = 'nulo';
    } else if (candidatoId === 'BRANCO') {
      tipoVoto = 'branco';
    } else {
      candidatoIdFinal = candidatoId;
      
      // Verificar se o candidato existe e pertence à eleição
      const { data: candidato, error: candidatoError } = await supabase
        .from('candidatos')
        .select('id')
        .eq('id', candidatoId)
        .eq('eleicao_id', eleitor.eleicao_id)
        .single();

      if (candidatoError || !candidato) {
        return errorResponse(res, 'Candidato não encontrado ou não pertence à eleição ativa', 400);
      }
    }

    // Comunicar com ESP32 (simulado)
    const esp32Response = await comunicarComESP32({
      idCandidato: candidatoId,
      tipoVoto,
      eleitorMatricula
    });

    if (!esp32Response.sucesso) {
      return errorResponse(res, 'Falha na comunicação com a urna eletrônica. Tente novamente.', 503);
    }

    // Registrar voto no banco de dados
    const { data: voto, error: votoError } = await supabase
      .from('votos')
      .insert({
        eleitor_matricula: eleitorMatricula,
        candidato_id: candidatoIdFinal,
        tipo_voto: tipoVoto,
        eleicao_id: eleitor.eleicao_id,
        hash_verificacao: generateAuditCode()
      })
      .select()
      .single();

    if (votoError) {
      throw votoError;
    }

    // Atualizar eleitor como já votou
    await supabase
      .from('eleitores')
      .update({ 
        ja_votou: true,
        horario_voto: new Date().toISOString()
      })
      .eq('id', eleitor.id);

    // Log de auditoria
    await supabase
      .from('logs_auditoria')
      .insert({
        acao: 'REGISTRO_VOTO',
        tabela_afetada: 'votos',
        registro_id: voto.id,
        dados_novos: { 
          eleitor_matricula: eleitorMatricula,
          tipo_voto: tipoVoto,
          hash_verificacao: voto.hash_verificacao
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    // Emitir atualização em tempo real
    if (global.emitRealTimeUpdate) {
      global.emitRealTimeUpdate(eleitor.eleicao_id, {
        type: 'new_vote',
        eleicaoId: eleitor.eleicao_id,
        tipoVoto
      });
    }

    logger.info(`Voto registrado com sucesso - Eleitor: ${eleitorMatricula}, Tipo: ${tipoVoto}`);

    return successResponse(res, {
      hash_verificacao: voto.hash_verificacao,
      timestamp: voto.created_at
    }, 'Voto registrado com sucesso.');

  } catch (error) {
    logger.error('Erro ao registrar voto:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Função para comunicar com ESP32
const comunicarComESP32 = async (dadosVoto) => {
  try {
    const esp32Ip = process.env.ESP32_DEFAULT_IP || '192.168.1.100';
    const timeout = parseInt(process.env.ESP32_TIMEOUT) || 5000;

    const response = await axios.post(
      `http://${esp32Ip}/registrar-voto`,
      dadosVoto,
      {
        timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      logger.info(`Comando enviado para ESP32 com sucesso - IP: ${esp32Ip}`);
      return { sucesso: true, dados: response.data };
    }

    return { sucesso: false, erro: 'Resposta inválida do ESP32' };

  } catch (error) {
    logger.error('Erro na comunicação com ESP32:', error.message);
    
    // Em ambiente de desenvolvimento, simular sucesso
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Simulando sucesso na comunicação com ESP32 (desenvolvimento)');
      return { sucesso: true, dados: { status: 'simulado' } };
    }

    return { sucesso: false, erro: error.message };
  }
};

module.exports = {
  validarEleitor,
  getCandidatos,
  registrarVoto
};
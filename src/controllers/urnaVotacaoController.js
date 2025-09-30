const { supabase } = require('../../api/config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Função simplificada para registrar voto
const registrarVoto = async (req, res) => {
  try {
    const { eleitor_matricula, candidato_numero } = req.body;

    // Validar dados básicos
    if (!eleitor_matricula || !candidato_numero) {
      return errorResponse(res, 'Matrícula do eleitor e número do candidato são obrigatórios', 400);
    }

    console.log(`📝 Tentativa de voto: Eleitor ${eleitor_matricula} -> Candidato ${candidato_numero}`);

    // 1. Buscar eleitor pela matrícula
    const { data: eleitor, error: eleitorError } = await supabase
      .from('eleitores')
      .select('id, nome, matricula, ja_votou')
      .eq('matricula', eleitor_matricula)
      .single();

    if (eleitorError || !eleitor) {
      return errorResponse(res, 'Eleitor não encontrado', 404);
    }

    // 2. Verificar se já votou
    if (eleitor.ja_votou) {
      return errorResponse(res, 'Eleitor já votou nesta eleição', 409);
    }

    // 3. Buscar candidato pelo número
    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('id, nome, numero, eleicao_id')
      .eq('numero', candidato_numero)
      .single();

    if (candidatoError || !candidato) {
      return errorResponse(res, 'Candidato não encontrado', 404);
    }

    // 4. Gerar hash simples para o voto
    const timestamp = Date.now();
    const hashVoto = `voto_${timestamp}_${Math.random().toString(36).substring(7)}`;

    // 5. Registrar o voto
    const { data: voto, error: votoError } = await supabase
      .from('votos')
      .insert({
        eleitor_id: eleitor.id,
        candidato_id: candidato.id,
        eleicao_id: candidato.eleicao_id,
        hash_verificacao: hashVoto
      })
      .select()
      .single();

    if (votoError) {
      console.error('Erro ao inserir voto:', votoError);
      return errorResponse(res, 'Erro ao registrar voto', 500);
    }

    // 6. Marcar eleitor como "já votou"
    const { error: updateError } = await supabase
      .from('eleitores')
      .update({ 
        ja_votou: true, 
        horario_voto: new Date().toISOString() 
      })
      .eq('id', eleitor.id);

    if (updateError) {
      console.error('Erro ao atualizar eleitor:', updateError);
    }

    // 7. Sucesso!
    console.log(`✅ Voto registrado: ${eleitor.nome} votou no candidato ${candidato.nome}`);

    return successResponse(res, {
      hash_verificacao: hashVoto,
      eleitor: eleitor.nome,
      candidato: candidato.nome,
      numero: candidato.numero,
      timestamp: new Date().toISOString()
    }, 'Voto registrado com sucesso!');

  } catch (error) {
    console.error('💥 Erro no registro de voto:', error);
    logger.error('Erro ao registrar voto:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Função para validar eleitor (simplificada)
const validarEleitor = async (req, res) => {
  try {
    const { matricula } = req.body;

    if (!matricula) {
      return errorResponse(res, 'Matrícula é obrigatória', 400);
    }

    console.log(`🔍 Validando eleitor: ${matricula}`);

    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .select('id, nome, matricula, ja_votou, horario_voto')
      .eq('matricula', matricula)
      .single();

    if (error || !eleitor) {
      return errorResponse(res, 'Eleitor não encontrado', 404);
    }

    const podeVotar = !eleitor.ja_votou;

    return successResponse(res, {
      eleitor: {
        nome: eleitor.nome,
        matricula: eleitor.matricula,
        ja_votou: eleitor.ja_votou
      },
      pode_votar: podeVotar,
      status: podeVotar ? 'liberado' : 'ja_votou'
    }, 'Eleitor encontrado');

  } catch (error) {
    console.error('💥 Erro na validação:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Função para listar candidatos (simplificada)
const listarCandidatos = async (req, res) => {
  try {
    console.log('📋 Listando candidatos...');

    const { data: candidatos, error } = await supabase
      .from('candidatos')
      .select('id, numero, nome, partido')
      .order('numero');

    if (error) {
      console.error('Erro ao buscar candidatos:', error);
      return errorResponse(res, 'Erro ao buscar candidatos', 500);
    }

    return successResponse(res, { candidatos }, 'Candidatos listados com sucesso');

  } catch (error) {
    console.error('💥 Erro ao listar candidatos:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  registrarVoto,
  validarEleitor,
  listarCandidatos
};
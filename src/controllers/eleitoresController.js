const { supabase } = require('../../api/config/supabase');
const { successResponse, errorResponse, isValidCPF } = require('../utils/helpers');
const logger = require('../utils/logger');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Controller para listar todos os eleitores
const listarEleitores = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, eleicao_id, ja_votou } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('eleitores')
      .select(`
        id,
        matricula,
        nome,
        cpf,
        email,
        telefone,
        ja_votou,
        horario_voto,
        created_at,
        eleicoes(titulo, status)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,matricula.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    if (eleicao_id) {
      query = query.eq('eleicao_id', eleicao_id);
    }

    if (ja_votou !== undefined) {
      query = query.eq('ja_votou', ja_votou === 'true');
    }

    query = query.range(offset, offset + limit - 1).order('nome');

    const { data: eleitores, error, count } = await query;

    if (error) throw error;

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };

    return successResponse(res, { eleitores, pagination }, 'Eleitores listados com sucesso');

  } catch (error) {
    logger.error('Erro ao listar eleitores:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter um eleitor específico
const obterEleitor = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .select(`
        id,
        matricula,
        nome,
        cpf,
        email,
        telefone,
        ja_votou,
        horario_voto,
        created_at,
        eleicoes(id, titulo, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Eleitor não encontrado', 404);
      }
      throw error;
    }

    return successResponse(res, eleitor, 'Eleitor obtido com sucesso');

  } catch (error) {
    logger.error('Erro ao obter eleitor:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para criar um novo eleitor
const criarEleitor = async (req, res) => {
  try {
    const { matricula, nome, cpf, email, telefone, eleicao_id } = req.body;

    // Validar CPF
    if (!isValidCPF(cpf)) {
      return errorResponse(res, 'CPF inválido', 400);
    }

    // Verificar se a matrícula já existe na eleição
    const { data: eleitorExistente } = await supabase
      .from('eleitores')
      .select('id')
      .eq('matricula', matricula)
      .eq('eleicao_id', eleicao_id)
      .single();

    if (eleitorExistente) {
      return errorResponse(res, 'Já existe um eleitor com esta matrícula nesta eleição', 409);
    }

    // Verificar se o CPF já existe na eleição
    const { data: cpfExistente } = await supabase
      .from('eleitores')
      .select('id')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .eq('eleicao_id', eleicao_id)
      .single();

    if (cpfExistente) {
      return errorResponse(res, 'Já existe um eleitor com este CPF nesta eleição', 409);
    }

    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .insert({
        matricula,
        nome,
        cpf: cpf.replace(/\D/g, ''), // Remover formatação do CPF
        email,
        telefone,
        eleicao_id
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Eleitor criado com sucesso - ID: ${eleitor.id}, Matrícula: ${matricula}`);

    return successResponse(res, eleitor, 'Eleitor criado com sucesso', 201);

  } catch (error) {
    logger.error('Erro ao criar eleitor:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para atualizar um eleitor
const atualizarEleitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { matricula, nome, cpf, email, telefone, eleicao_id } = req.body;

    // Validar CPF
    if (cpf && !isValidCPF(cpf)) {
      return errorResponse(res, 'CPF inválido', 400);
    }

    // Verificar se o eleitor existe
    const { data: eleitorExistente, error: erroExistente } = await supabase
      .from('eleitores')
      .select('id, matricula, cpf, eleicao_id')
      .eq('id', id)
      .single();

    if (erroExistente || !eleitorExistente) {
      return errorResponse(res, 'Eleitor não encontrado', 404);
    }

    // Verificar duplicatas de matrícula
    if (matricula && (matricula !== eleitorExistente.matricula || eleicao_id !== eleitorExistente.eleicao_id)) {
      const { data: matriculaExistente } = await supabase
        .from('eleitores')
        .select('id')
        .eq('matricula', matricula)
        .eq('eleicao_id', eleicao_id || eleitorExistente.eleicao_id)
        .neq('id', id)
        .single();

      if (matriculaExistente) {
        return errorResponse(res, 'Já existe um eleitor com esta matrícula nesta eleição', 409);
      }
    }

    // Verificar duplicatas de CPF
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : eleitorExistente.cpf;
    if (cpf && (cpfLimpo !== eleitorExistente.cpf || eleicao_id !== eleitorExistente.eleicao_id)) {
      const { data: cpfExistente } = await supabase
        .from('eleitores')
        .select('id')
        .eq('cpf', cpfLimpo)
        .eq('eleicao_id', eleicao_id || eleitorExistente.eleicao_id)
        .neq('id', id)
        .single();

      if (cpfExistente) {
        return errorResponse(res, 'Já existe um eleitor com este CPF nesta eleição', 409);
      }
    }

    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .update({
        matricula,
        nome,
        cpf: cpfLimpo,
        email,
        telefone,
        eleicao_id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Eleitor atualizado com sucesso - ID: ${id}`);

    return successResponse(res, eleitor, 'Eleitor atualizado com sucesso');

  } catch (error) {
    logger.error('Erro ao atualizar eleitor:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para excluir um eleitor
const excluirEleitor = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o eleitor já votou
    const { data: eleitor, error: eleitorError } = await supabase
      .from('eleitores')
      .select('ja_votou')
      .eq('id', id)
      .single();

    if (eleitorError || !eleitor) {
      return errorResponse(res, 'Eleitor não encontrado', 404);
    }

    if (eleitor.ja_votou) {
      return errorResponse(res, 'Não é possível excluir eleitor que já votou', 409);
    }

    const { error } = await supabase
      .from('eleitores')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Eleitor excluído com sucesso - ID: ${id}`);

    return successResponse(res, null, 'Eleitor excluído com sucesso');

  } catch (error) {
    logger.error('Erro ao excluir eleitor:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para importar eleitores via CSV/Excel
const importarEleitores = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Arquivo não fornecido', 400);
    }

    const { eleicao_id } = req.body;
    if (!eleicao_id) {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, 'ID da eleição é obrigatório', 400);
    }

    // Verificar se a eleição existe
    const { data: eleicao, error: eleicaoError } = await supabase
      .from('eleicoes')
      .select('id')
      .eq('id', eleicao_id)
      .single();

    if (eleicaoError || !eleicao) {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, 'Eleição não encontrada', 404);
    }

    let eleitores = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    // Processar arquivo baseado na extensão
    if (fileExtension === '.csv') {
      eleitores = await processarCSV(req.file.path);
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      eleitores = await processarExcel(req.file.path);
    } else {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, 'Formato de arquivo não suportado. Use CSV ou Excel', 400);
    }

    // Validar e inserir eleitores
    const resultados = await inserirEleitores(eleitores, eleicao_id);

    // Remover arquivo temporário
    fs.unlinkSync(req.file.path);

    logger.info(`Importação concluída - Sucesso: ${resultados.sucesso}, Erros: ${resultados.erros.length}`);

    return successResponse(res, resultados, 'Importação processada com sucesso');

  } catch (error) {
    // Limpar arquivo se houve erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    logger.error('Erro na importação de eleitores:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Função para processar arquivo CSV
const processarCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const eleitores = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        eleitores.push(data);
      })
      .on('end', () => {
        resolve(eleitores);
      })
      .on('error', reject);
  });
};

// Função para processar arquivo Excel
const processarExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const eleitores = xlsx.utils.sheet_to_json(worksheet);
    
    return eleitores;
  } catch (error) {
    throw new Error('Erro ao processar arquivo Excel: ' + error.message);
  }
};

// Função para inserir eleitores no banco
const inserirEleitores = async (eleitores, eleicao_id) => {
  let sucessos = 0;
  const erros = [];

  for (let i = 0; i < eleitores.length; i++) {
    const eleitor = eleitores[i];
    
    try {
      // Mapear campos (aceitar variações de nomes de colunas)
      const matricula = eleitor.matricula || eleitor.Matricula || eleitor.MATRICULA;
      const nome = eleitor.nome || eleitor.Nome || eleitor.NOME;
      const cpf = eleitor.cpf || eleitor.CPF || eleitor.Cpf;
      const email = eleitor.email || eleitor.Email || eleitor.EMAIL;
      const telefone = eleitor.telefone || eleitor.Telefone || eleitor.TELEFONE;

      // Validações básicas
      if (!matricula || !nome || !cpf) {
        erros.push({
          linha: i + 1,
          erro: 'Campos obrigatórios não preenchidos (matricula, nome, cpf)'
        });
        continue;
      }

      if (!isValidCPF(cpf)) {
        erros.push({
          linha: i + 1,
          erro: 'CPF inválido',
          cpf
        });
        continue;
      }

      // Verificar duplicatas
      const { data: duplicata } = await supabase
        .from('eleitores')
        .select('id')
        .eq('eleicao_id', eleicao_id)
        .or(`matricula.eq.${matricula},cpf.eq.${cpf.replace(/\D/g, '')}`)
        .single();

      if (duplicata) {
        erros.push({
          linha: i + 1,
          erro: 'Matrícula ou CPF já existe na eleição',
          matricula,
          cpf
        });
        continue;
      }

      // Inserir eleitor
      const { error } = await supabase
        .from('eleitores')
        .insert({
          matricula,
          nome,
          cpf: cpf.replace(/\D/g, ''),
          email: email || null,
          telefone: telefone || null,
          eleicao_id
        });

      if (error) {
        erros.push({
          linha: i + 1,
          erro: error.message,
          matricula
        });
      } else {
        sucessos++;
      }

    } catch (error) {
      erros.push({
        linha: i + 1,
        erro: error.message
      });
    }
  }

  return {
    sucesso: sucessos,
    erros,
    total: eleitores.length
  };
};

module.exports = {
  listarEleitores,
  obterEleitor,
  criarEleitor,
  atualizarEleitor,
  excluirEleitor,
  importarEleitores
};
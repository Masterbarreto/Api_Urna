const Joi = require('joi');

// Validação para login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ter um formato válido',
    'any.required': 'Email é obrigatório'
  }),
  senha: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter pelo menos 6 caracteres',
    'any.required': 'Senha é obrigatória'
  })
});

// Validação para urna
const urnaSchema = Joi.object({
  numero: Joi.string().required().messages({
    'any.required': 'Número da urna é obrigatório'
  }),
  localizacao: Joi.string().required().messages({
    'any.required': 'Localização é obrigatória'
  }),
  status: Joi.string().valid('ativa', 'inativa', 'manutencao').default('ativa'),
  ip_address: Joi.string().ip().allow('').optional()
});

// Validação para eleição
const eleicaoSchema = Joi.object({
  titulo: Joi.string().required().messages({
    'any.required': 'Título da eleição é obrigatório'
  }),
  descricao: Joi.string().allow('').optional(),
  data_inicio: Joi.date().iso().required().messages({
    'any.required': 'Data de início é obrigatória'
  }),
  data_fim: Joi.date().iso().greater(Joi.ref('data_inicio')).required().messages({
    'date.greater': 'Data de fim deve ser posterior à data de início',
    'any.required': 'Data de fim é obrigatória'
  }),
  status: Joi.string().valid('criada', 'ativa', 'finalizada', 'cancelada').default('criada')
});

// Validação para candidato
const candidatoSchema = Joi.object({
  numero: Joi.string().required().messages({
    'any.required': 'Número do candidato é obrigatório'
  }),
  nome: Joi.string().required().messages({
    'any.required': 'Nome do candidato é obrigatório'
  }),
  partido: Joi.string().required().messages({
    'any.required': 'Partido é obrigatório'
  }),
  eleicao_id: Joi.string().uuid().required().messages({
    'any.required': 'ID da eleição é obrigatório'
  }),
  foto_url: Joi.string().uri().allow('').optional()
});

// Validação para eleitor
const eleitorSchema = Joi.object({
  nome: Joi.string().required().messages({
    'any.required': 'Nome completo é obrigatório'
  }),
  cpf: Joi.string().pattern(/^\d{11}$/).required().messages({
    'string.pattern.base': 'CPF deve conter 11 dígitos',
    'any.required': 'CPF é obrigatório'
  }),
  matricula: Joi.string().required().messages({
    'any.required': 'Matrícula é obrigatória'
  })
});

// Validação para voto
const votoSchema = Joi.object({
  eleitor_matricula: Joi.string().required().messages({
    'any.required': 'Matrícula do eleitor é obrigatória'
  }),
  candidato_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().valid('NULO', 'BRANCO')
  ).required().messages({
    'any.required': 'ID do candidato ou voto especial é obrigatório'
  }),
  eleicao_id: Joi.string().uuid().required().messages({
    'any.required': 'ID da eleição é obrigatório'
  }),
  urna_id: Joi.string().uuid().allow('').optional()
});

// Validação para validação de eleitor
const validarEleitorSchema = Joi.object({
  matricula: Joi.string().required().messages({
    'any.required': 'Matrícula é obrigatória'
  })
});

// Validação para parâmetros de query
const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional(),
  eleicao_id: Joi.string().uuid().optional(),
  status: Joi.string().optional()
});

module.exports = {
  loginSchema,
  urnaSchema,
  eleicaoSchema,
  candidatoSchema,
  eleitorSchema,
  votoSchema,
  validarEleitorSchema,
  queryParamsSchema
};
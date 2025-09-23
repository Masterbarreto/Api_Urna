const express = require('express');
const router = express.Router();

const auditoriaController = require('../controllers/auditoriaController');
const { authenticateToken, requireOperator } = require('../middlewares/auth');
const { validateUUID } = require('../middlewares/validation');
const Joi = require('joi');
const { validateSchema } = require('../middlewares/validation');

// Schema para filtros de auditoria
const auditoriaQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  acao: Joi.string().allow('').optional(),
  usuario_id: Joi.string().uuid().optional(),
  tabela_afetada: Joi.string().allow('').optional(),
  data_inicio: Joi.date().iso().optional(),
  data_fim: Joi.date().iso().optional()
});

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireOperator);

// Rota para listar logs de auditoria - GET /api/v1/auditoria
router.get('/', 
  validateSchema(auditoriaQuerySchema, 'query'),
  auditoriaController.listarLogsAuditoria
);

// Rota para obter estatísticas de auditoria - GET /api/v1/auditoria/estatisticas
router.get('/estatisticas', 
  auditoriaController.obterEstatisticasAuditoria
);

// Rota para obter um log específico - GET /api/v1/auditoria/:id
router.get('/:id', 
  validateUUID(),
  auditoriaController.obterLogAuditoria
);

module.exports = router;
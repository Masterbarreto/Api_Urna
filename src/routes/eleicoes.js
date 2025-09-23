const express = require('express');
const router = express.Router();

const eleicoesController = require('../controllers/eleicoesController');
const { authenticateToken, requireAdmin, requireOperator } = require('../middlewares/auth');
const { validateSchema, validateUUID } = require('../middlewares/validation');
const { auditLogger } = require('../middlewares/audit');
const { eleicaoSchema, queryParamsSchema } = require('../utils/validation');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rota para listar todas as eleições - GET /api/v1/eleicoes
router.get('/', 
  requireOperator,
  validateSchema(queryParamsSchema, 'query'),
  eleicoesController.listarEleicoes
);

// Rota para obter uma eleição específica - GET /api/v1/eleicoes/:id
router.get('/:id', 
  requireOperator,
  validateUUID(),
  eleicoesController.obterEleicao
);

// Rota para criar uma nova eleição - POST /api/v1/eleicoes
router.post('/', 
  requireAdmin,
  validateSchema(eleicaoSchema),
  auditLogger('criar eleição'),
  eleicoesController.criarEleicao
);

// Rota para atualizar uma eleição - PUT /api/v1/eleicoes/:id
router.put('/:id', 
  requireAdmin,
  validateUUID(),
  validateSchema(eleicaoSchema),
  auditLogger('atualizar eleição'),
  eleicoesController.atualizarEleicao
);

// Rota para excluir uma eleição - DELETE /api/v1/eleicoes/:id
router.delete('/:id', 
  requireAdmin,
  validateUUID(),
  auditLogger('excluir eleição'),
  eleicoesController.excluirEleicao
);

module.exports = router;
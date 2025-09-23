const express = require('express');
const router = express.Router();

const resultadosController = require('../controllers/resultadosController');
const { authenticateToken, requireOperator } = require('../middlewares/auth');
const { validateUUID } = require('../middlewares/validation');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireOperator);

// Rota para obter resultados de uma eleição - GET /api/v1/resultados/:eleicaoId
router.get('/:eleicaoId', 
  validateUUID('eleicaoId'),
  resultadosController.obterResultados
);

// Rota para exportar resultados - GET /api/v1/resultados/:eleicaoId/exportar
router.get('/:eleicaoId/exportar', 
  validateUUID('eleicaoId'),
  resultadosController.exportarResultados
);

module.exports = router;
const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireOperator } = require('../middlewares/auth');
const { validateUUID } = require('../middlewares/validation');

// Aplicar autenticação em todas as rotas do dashboard
router.use(authenticateToken);
router.use(requireOperator);

// Rota para obter estatísticas gerais do dashboard - GET /api/v1/dashboard/summary
router.get('/summary', dashboardController.getDashboardSummary);

// Rota para obter dados do gráfico de votos - GET /api/v1/dashboard/grafico/:eleicaoId
router.get('/grafico/:eleicaoId', 
  validateUUID('eleicaoId'),
  dashboardController.getGraficoVotos
);

// Rota para obter status das urnas - GET /api/v1/dashboard/urnas-status
router.get('/urnas-status', dashboardController.getStatusUrnas);

module.exports = router;
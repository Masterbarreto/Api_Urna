const express = require('express');
const router = express.Router();

const urnasController = require('../controllers/urnasController');
const { authenticateToken, requireAdmin, requireOperator } = require('../middlewares/auth');
const { validateSchema, validateUUID } = require('../middlewares/validation');
const { auditLogger } = require('../middlewares/audit');
const { urnaSchema, queryParamsSchema } = require('../utils/validation');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rota para listar todas as urnas - GET /api/v1/urnas
router.get('/', 
  requireOperator,
  validateSchema(queryParamsSchema, 'query'),
  urnasController.listarUrnas
);

// Rota para obter uma urna específica - GET /api/v1/urnas/:id
router.get('/:id', 
  requireOperator,
  validateUUID(),
  urnasController.obterUrna
);

// Rota para criar uma nova urna - POST /api/v1/urnas
router.post('/', 
  requireAdmin,
  validateSchema(urnaSchema),
  auditLogger('criar urna'),
  urnasController.criarUrna
);

// Rota para atualizar uma urna - PUT /api/v1/urnas/:id
router.put('/:id', 
  requireAdmin,
  validateUUID(),
  validateSchema(urnaSchema),
  auditLogger('atualizar urna'),
  urnasController.atualizarUrna
);

// Rota para excluir uma urna - DELETE /api/v1/urnas/:id
router.delete('/:id', 
  requireAdmin,
  validateUUID(),
  auditLogger('excluir urna'),
  urnasController.excluirUrna
);

// Rota para atualizar ping da urna (usada pelo ESP32) - POST /api/v1/urnas/:numero/ping
router.post('/:numero/ping', 
  // Esta rota não precisa de autenticação pois é usada pelo ESP32
  (req, res, next) => {
    // Remover middleware de autenticação para esta rota específica
    next();
  }
);

// Remover autenticação para a rota de ping e redefinir
router.post('/:numero/ping', urnasController.atualizarPing);

module.exports = router;
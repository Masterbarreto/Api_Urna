const express = require('express');
const router = express.Router();

const candidatosController = require('../controllers/candidatosController');
const { authenticateToken, requireAdmin, requireOperator } = require('../middlewares/auth');
const { validateSchema, validateUUID } = require('../middlewares/validation');
const { auditLogger } = require('../middlewares/audit');
const { candidatoSchema, queryParamsSchema } = require('../utils/validation');
const { upload } = require('../config/upload');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rota para servir arquivos de upload (fotos dos candidatos)
router.use('/uploads', express.static('uploads'));

// Rota para listar todos os candidatos - GET /api/v1/candidatos
router.get('/', 
  requireOperator,
  validateSchema(queryParamsSchema, 'query'),
  candidatosController.listarCandidatos
);

// Rota para obter um candidato específico - GET /api/v1/candidatos/:id
router.get('/:id', 
  requireOperator,
  validateUUID(),
  candidatosController.obterCandidato
);

// Rota para criar um novo candidato - POST /api/v1/candidatos
router.post('/', 
  requireAdmin,
  upload.single('foto'), // Campo 'foto' para upload da imagem
  validateSchema(candidatoSchema),
  auditLogger('criar candidato'),
  candidatosController.criarCandidato
);

// Rota para atualizar um candidato - PUT /api/v1/candidatos/:id
router.put('/:id', 
  requireAdmin,
  validateUUID(),
  upload.single('foto'), // Campo 'foto' para upload da imagem
  validateSchema(candidatoSchema),
  auditLogger('atualizar candidato'),
  candidatosController.atualizarCandidato
);

// Rota para excluir um candidato - DELETE /api/v1/candidatos/:id
router.delete('/:id', 
  requireAdmin,
  validateUUID(),
  auditLogger('excluir candidato'),
  candidatosController.excluirCandidato
);

module.exports = router;
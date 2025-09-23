const express = require('express');
const router = express.Router();
const multer = require('multer');

const eleitoresController = require('../controllers/eleitoresController');
const { authenticateToken, requireAdmin, requireOperator } = require('../middlewares/auth');
const { validateSchema, validateUUID } = require('../middlewares/validation');
const { auditLogger } = require('../middlewares/audit');
const { eleitorSchema, queryParamsSchema } = require('../utils/validation');

// Configuração do multer para upload de arquivos
const upload = multer({
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use CSV ou Excel'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rota para listar todos os eleitores - GET /api/v1/eleitores
router.get('/', 
  requireOperator,
  validateSchema(queryParamsSchema, 'query'),
  eleitoresController.listarEleitores
);

// Rota para obter um eleitor específico - GET /api/v1/eleitores/:id
router.get('/:id', 
  requireOperator,
  validateUUID(),
  eleitoresController.obterEleitor
);

// Rota para criar um novo eleitor - POST /api/v1/eleitores
router.post('/', 
  requireAdmin,
  validateSchema(eleitorSchema),
  auditLogger('criar eleitor'),
  eleitoresController.criarEleitor
);

// Rota para importar eleitores via arquivo - POST /api/v1/eleitores/importar
router.post('/importar', 
  requireAdmin,
  upload.single('arquivo'),
  auditLogger('importar eleitores'),
  eleitoresController.importarEleitores
);

// Rota para atualizar um eleitor - PUT /api/v1/eleitores/:id
router.put('/:id', 
  requireAdmin,
  validateUUID(),
  validateSchema(eleitorSchema),
  auditLogger('atualizar eleitor'),
  eleitoresController.atualizarEleitor
);

// Rota para excluir um eleitor - DELETE /api/v1/eleitores/:id
router.delete('/:id', 
  requireAdmin,
  validateUUID(),
  auditLogger('excluir eleitor'),
  eleitoresController.excluirEleitor
);

module.exports = router;
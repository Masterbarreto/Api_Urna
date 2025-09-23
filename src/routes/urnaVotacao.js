const express = require('express');
const router = express.Router();

const urnaVotacaoController = require('../controllers/urnaVotacaoController');
const { validateSchema } = require('../middlewares/validation');
const { validarEleitorSchema, votoSchema } = require('../utils/validation');

// Rota para validar eleitor - POST /api/eleitores/validar
router.post('/eleitores/validar', 
  validateSchema(validarEleitorSchema),
  urnaVotacaoController.validarEleitor
);

// Rota para obter candidatos - GET /api/candidatos
router.get('/candidatos', 
  urnaVotacaoController.getCandidatos
);

// Rota para registrar voto - POST /api/votos
router.post('/votos', 
  validateSchema(votoSchema),
  urnaVotacaoController.registrarVoto
);

module.exports = router;
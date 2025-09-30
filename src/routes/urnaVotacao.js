const express = require('express');
const router = express.Router();
const { registrarVoto, validarEleitor, listarCandidatos } = require('../../src/controllers/urnaVotacaoController');

// Rotas simplificadas para teclado matricial
router.post('/validar-eleitor', validarEleitor);
router.post('/votar', registrarVoto);
router.get('/candidatos', listarCandidatos);

module.exports = router;
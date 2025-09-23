const urnasController = require('../../src/controllers/urnasController');
const eleicoesController = require('../../src/controllers/eleicoesController');
const candidatosController = require('../../src/controllers/candidatosController');
const eleitoresController = require('../../src/controllers/eleitoresController');
const resultadosController = require('../../src/controllers/resultadosController');
const auditoriaController = require('../../src/controllers/auditoriaController');

module.exports = {
  urnas: urnasController,
  eleicoes: eleicoesController,
  candidatos: candidatosController,
  eleitores: eleitoresController,
  resultados: resultadosController,
  auditoria: auditoriaController
};
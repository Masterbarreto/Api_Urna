const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('../src/routes/auth');
const dashboardRoutes = require('../src/routes/dashboard');
const urnasRoutes = require('../src/routes/urnas');
const eleicoesRoutes = require('../src/routes/eleicoes');
const candidatosRoutes = require('../src/routes/candidatos');
const eleitoresRoutes = require('../src/routes/eleitores');
const resultadosRoutes = require('../src/routes/resultados');
const auditoriaRoutes = require('../src/routes/auditoria');
const urnaVotacaoRoutes = require('../src/routes/urnaVotacao');

// Rotas de autenticação
router.use('/auth', authRoutes);

// Rotas de administração e monitoramento (v1)
router.use('/v1/dashboard', dashboardRoutes);
router.use('/v1/urnas', urnasRoutes);
router.use('/v1/eleicoes', eleicoesRoutes);
router.use('/v1/candidatos', candidatosRoutes);
router.use('/v1/eleitores', eleitoresRoutes);
router.use('/v1/resultados', resultadosRoutes);
router.use('/v1/auditoria', auditoriaRoutes);

// Rotas específicas da urna de votação
router.use('/urna-votacao', urnaVotacaoRoutes);

// Rota de documentação
router.get('/docs', (req, res) => {
  res.json({
    message: '📚 Documentação da API da Urna Eletrônica',
    version: '1.0.0',
    endpoints: {
      authentication: '/api/auth',
      dashboard: '/api/v1/dashboard',
      urnas: '/api/v1/urnas',
      eleicoes: '/api/v1/eleicoes',
      candidatos: '/api/v1/candidatos',
      eleitores: '/api/v1/eleitores',
      resultados: '/api/v1/resultados',
      auditoria: '/api/v1/auditoria',
      votacao: '/api/urna-votacao'
    }
  });
});

module.exports = router;
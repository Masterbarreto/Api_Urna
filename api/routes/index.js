const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('../../src/routes/auth');
const dashboardRoutes = require('../../src/routes/dashboard');
const urnasRoutes = require('../../src/routes/urnas');
const eleicoesRoutes = require('../../src/routes/eleicoes');
const candidatosRoutes = require('./candidatos');
const eleitoresRoutes = require('./eleitores');
const votosRoutes = require('./votos');
const urnaVotacaoRoutes = require('./urna-votacao');
const urnaSimpleRoutes = require('./urna-simple'); // Nova rota

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
router.use('/urna-simple', urnaSimpleRoutes); // Nova rota simplificada

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

// Rota temporária para setup inicial (criar admin)
router.post('/setup', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { supabase } = require('../config/supabase');
    
    // Verificar se já existe admin
    const { data: existingAdmin } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', 'admin@urna.com')
      .single();
      
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Usuário administrador já existe'
      });
    }
    
    // Criar usuário administrador
    const senhaAdmin = await bcrypt.hash('admin123', 12);
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .insert([
        {
          nome: 'Administrador',
          email: 'admin@urna.com',
          senha_hash: senhaAdmin,
          tipo: 'admin',
          ativo: true
        }
      ])
      .select('id, nome, email, tipo')
      .single();

    if (adminError) {
      throw adminError;
    }

    res.status(201).json({
      success: true,
      message: '🎉 Usuário administrador criado com sucesso!',
      data: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        tipo: admin.tipo
      },
      credentials: {
        email: 'admin@urna.com',
        senha: 'admin123'
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário administrador',
      error: error.message
    });
  }
});

module.exports = router;
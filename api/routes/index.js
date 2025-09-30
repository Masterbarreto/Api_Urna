const express = require('express');
const router = express.Router();

// Importar rotas que existem na estrutura real
const authRoutes = require('../../src/routes/auth');
const dashboardRoutes = require('../../src/routes/dashboard');
const urnasRoutes = require('../../src/routes/urnas');
const eleicoesRoutes = require('../../src/routes/eleicoes');
const candidatosRoutes = require('../../src/routes/candidatos');
const eleitoresRoutes = require('../../src/routes/eleitores');
const urnaVotacaoRoutes = require('../../src/routes/urnaVotacao');

// Rotas de autenticação
router.use('/auth', authRoutes);

// Rotas de administração e monitoramento (v1)
router.use('/v1/dashboard', dashboardRoutes);
router.use('/v1/urnas', urnasRoutes);
router.use('/v1/eleicoes', eleicoesRoutes);
router.use('/v1/candidatos', candidatosRoutes);
router.use('/v1/eleitores', eleitoresRoutes);

// Rotas específicas da urna de votação
router.use('/urna-votacao', urnaVotacaoRoutes);

// Rota simplificada para urna (inline - sem arquivo separado)
router.post('/urna-simple/validar-eleitor', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { matricula } = req.body;

    if (!matricula) {
      return res.status(400).json({
        status: 'erro',
        message: 'Matrícula é obrigatória'
      });
    }

    console.log(`🔍 Validando eleitor: ${matricula}`);

    const { data: eleitor, error } = await supabase
      .from('eleitores')
      .select('id, nome, matricula, ja_votou, horario_voto')
      .eq('matricula', matricula)
      .single();

    if (error || !eleitor) {
      return res.status(404).json({
        status: 'erro',
        message: 'Eleitor não encontrado'
      });
    }

    const podeVotar = !eleitor.ja_votou;

    res.json({
      status: 'sucesso',
      data: {
        eleitor: {
          nome: eleitor.nome,
          matricula: eleitor.matricula,
          ja_votou: eleitor.ja_votou
        },
        pode_votar: podeVotar,
        status: podeVotar ? 'liberado' : 'ja_votou'
      },
      message: 'Eleitor encontrado'
    });

  } catch (error) {
    console.error('💥 Erro na validação:', error);
    res.status(500).json({
      status: 'erro',
      message: 'Erro interno do servidor'
    });
  }
});

router.get('/urna-simple/candidatos', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    console.log('📋 Listando candidatos...');

    const { data: candidatos, error } = await supabase
      .from('candidatos')
      .select('id, numero, nome, partido')
      .order('numero');

    if (error) {
      console.error('Erro ao buscar candidatos:', error);
      return res.status(500).json({
        status: 'erro',
        message: 'Erro ao buscar candidatos'
      });
    }

    res.json({
      status: 'sucesso',
      data: { candidatos },
      message: 'Candidatos listados com sucesso'
    });

  } catch (error) {
    console.error('💥 Erro ao listar candidatos:', error);
    res.status(500).json({
      status: 'erro',
      message: 'Erro interno do servidor'
    });
  }
});

router.post('/urna-simple/votar', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { eleitor_matricula, candidato_numero } = req.body;

    // Validar dados básicos
    if (!eleitor_matricula || !candidato_numero) {
      return res.status(400).json({
        status: 'erro',
        message: 'Matrícula do eleitor e número do candidato são obrigatórios'
      });
    }

    console.log(`📝 Tentativa de voto: Eleitor ${eleitor_matricula} -> Candidato ${candidato_numero}`);

    // 1. Buscar eleitor pela matrícula
    const { data: eleitor, error: eleitorError } = await supabase
      .from('eleitores')
      .select('id, nome, matricula, ja_votou')
      .eq('matricula', eleitor_matricula)
      .single();

    if (eleitorError || !eleitor) {
      console.error('Erro ao buscar eleitor:', eleitorError);
      return res.status(404).json({
        status: 'erro',
        message: 'Eleitor não encontrado'
      });
    }

    // 2. Verificar se já votou
    if (eleitor.ja_votou) {
      return res.status(409).json({
        status: 'erro',
        message: 'Eleitor já votou nesta eleição'
      });
    }

    // 3. Buscar candidato pelo número
    const { data: candidatos, error: candidatoError } = await supabase
      .from('candidatos')
      .select('id, nome, numero, eleicao_id')
      .eq('numero', candidato_numero)
      .limit(1);

    if (candidatoError || !candidatos || candidatos.length === 0) {
      console.error('Erro ao buscar candidato:', candidatoError);
      return res.status(404).json({
        status: 'erro',
        message: 'Candidato não encontrado'
      });
    }

    const candidato = candidatos[0];

    // 4. Gerar hash simples para o voto
    const timestamp = Date.now();
    const hashVoto = `voto_${timestamp}_${Math.random().toString(36).substring(7)}`;

    // 5. Registrar o voto (TENTATIVA COM DIFERENTES VALORES)
    const valoresTipoVoto = ['candidato', 'branco', 'nulo', 'voto', 'eleitor'];
    let voto = null;
    let votoError = null;

    for (const tipoVoto of valoresTipoVoto) {
      console.log(`🔄 Tentando com tipo_voto: "${tipoVoto}"`);
      
      const resultado = await supabase
        .from('votos')
        .insert({
          eleitor_matricula: eleitor_matricula,
          candidato_id: candidato.id,
          eleicao_id: candidato.eleicao_id,
          hash_verificacao: hashVoto,
          tipo_voto: tipoVoto
        })
        .select()
        .single();

      if (!resultado.error) {
        voto = resultado.data;
        console.log(`✅ Sucesso com tipo_voto: "${tipoVoto}"`);
        break;
      } else {
        console.log(`❌ Falhou com tipo_voto: "${tipoVoto}" - ${resultado.error.message}`);
        votoError = resultado.error;
      }
    }

    // Se todas as tentativas falharam, tentar sem tipo_voto
    if (!voto) {
      console.log(`🔄 Tentando sem tipo_voto...`);
      
      const resultado = await supabase
        .from('votos')
        .insert({
          eleitor_matricula: eleitor_matricula,
          candidato_id: candidato.id,
          eleicao_id: candidato.eleicao_id,
          hash_verificacao: hashVoto
          // Removendo tipo_voto para usar valor padrão
        })
        .select()
        .single();

      voto = resultado.data;
      votoError = resultado.error;
    }

    if (votoError) {
      console.error('Erro ao inserir voto após todas as tentativas:', votoError);
      return res.status(500).json({
        status: 'erro',
        message: 'Erro ao registrar voto',
        debug: votoError
      });
    }

    // 6. Marcar eleitor como "já votou"
    const { error: updateError } = await supabase
      .from('eleitores')
      .update({ 
        ja_votou: true, 
        horario_voto: new Date().toISOString() 
      })
      .eq('id', eleitor.id);

    if (updateError) {
      console.error('Erro ao atualizar eleitor:', updateError);
    }

    // 7. Sucesso!
    console.log(`✅ Voto registrado: ${eleitor.nome} votou no candidato ${candidato.nome}`);

    res.json({
      status: 'sucesso',
      data: {
        hash_verificacao: hashVoto,
        eleitor: eleitor.nome,
        candidato: candidato.nome,
        numero: candidato.numero,
        timestamp: new Date().toISOString()
      },
      message: 'Voto registrado com sucesso!'
    });

  } catch (error) {
    console.error('💥 Erro no registro de voto:', error);
    res.status(500).json({
      status: 'erro',
      message: 'Erro interno do servidor',
      debug: error.message
    });
  }
});

// Rota de documentação
router.get('/docs', (req, res) => {
  res.json({
    message: '📚 API da Urna Eletrônica - Versão Simplificada',
    version: '1.0.0',
    endpoints: {
      authentication: '/api/auth',
      dashboard: '/api/v1/dashboard',
      urnas: '/api/v1/urnas',
      eleicoes: '/api/v1/eleicoes',
      candidatos: '/api/v1/candidatos',
      eleitores: '/api/v1/eleitores',
      votacao: '/api/urna-votacao',
      'votacao-simples': '/api/urna-simple'
    },
    'urna-simple': {
      'validar-eleitor': 'POST /api/urna-simple/validar-eleitor',
      'candidatos': 'GET /api/urna-simple/candidatos',
      'votar': 'POST /api/urna-simple/votar'
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
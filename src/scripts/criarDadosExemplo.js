#!/usr/bin/env node

/**
 * Script para criar dados de exemplo para teste da API
 */

require('dotenv').config();
const { supabase } = require('../src/config/supabase');
const { hashPassword } = require('../src/utils/helpers');
const logger = require('../src/utils/logger');

const criarDadosExemplo = async () => {
  try {
    logger.info('🚀 Iniciando criação de dados de exemplo...');

    // 1. Criar usuários de exemplo
    const senhaHash = await hashPassword('123456');
    
    const { data: operador, error: operadorError } = await supabase
      .from('usuarios')
      .insert({
        nome: 'Operador Exemplo',
        email: 'operador@urna.com',
        senha_hash: senhaHash,
        tipo: 'operador'
      })
      .select()
      .single();

    if (operadorError && operadorError.code !== '23505') {
      throw operadorError;
    }

    logger.info('✅ Usuários criados');

    // 2. Criar eleição de exemplo
    const dataInicio = new Date();
    dataInicio.setHours(8, 0, 0, 0);
    
    const dataFim = new Date();
    dataFim.setHours(17, 0, 0, 0);

    const { data: eleicao, error: eleicaoError } = await supabase
      .from('eleicoes')
      .insert({
        titulo: 'Eleição Exemplo 2024',
        descricao: 'Eleição de exemplo para demonstração do sistema',
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        status: 'ativa'
      })
      .select()
      .single();

    if (eleicaoError) throw eleicaoError;

    logger.info('✅ Eleição criada:', eleicao.titulo);

    // 3. Criar candidatos de exemplo
    const candidatos = [
      { numero: '12', nome: 'Ana Silva', partido: 'Partido da Inovação' },
      { numero: '25', nome: 'Carlos Santos', partido: 'Aliança Progressista' },
      { numero: '33', nome: 'Mariana Costa', partido: 'Movimento Popular' },
      { numero: '45', nome: 'João Oliveira', partido: 'Frente Democrática' }
    ];

    for (const candidato of candidatos) {
      const { error: candidatoError } = await supabase
        .from('candidatos')
        .insert({
          ...candidato,
          eleicao_id: eleicao.id
        });

      if (candidatoError && candidatoError.code !== '23505') {
        throw candidatoError;
      }
    }

    logger.info('✅ Candidatos criados');

    // 4. Criar urnas de exemplo
    const urnas = [
      { numero: '001', localizacao: 'Sala 101 - Bloco A', ip_address: '192.168.1.100' },
      { numero: '002', localizacao: 'Sala 102 - Bloco A', ip_address: '192.168.1.101' },
      { numero: '003', localizacao: 'Sala 201 - Bloco B', ip_address: '192.168.1.102' }
    ];

    for (const urna of urnas) {
      const { error: urnaError } = await supabase
        .from('urnas')
        .insert({
          ...urna,
          eleicao_id: eleicao.id
        });

      if (urnaError && urnaError.code !== '23505') {
        throw urnaError;
      }
    }

    logger.info('✅ Urnas criadas');

    // 5. Criar eleitores de exemplo
    const eleitores = [];
    for (let i = 1; i <= 50; i++) {
      eleitores.push({
        matricula: String(i).padStart(8, '0'),
        nome: `Eleitor ${i}`,
        cpf: String(10000000000 + i),
        email: `eleitor${i}@exemplo.com`,
        telefone: `11${String(900000000 + i)}`,
        eleicao_id: eleicao.id
      });
    }

    const { error: eleitoresError } = await supabase
      .from('eleitores')
      .insert(eleitores);

    if (eleitoresError && eleitoresError.code !== '23505') {
      throw eleitoresError;
    }

    logger.info('✅ Eleitores criados');

    // 6. Simular alguns votos
    const { data: candidatosList } = await supabase
      .from('candidatos')
      .select('id')
      .eq('eleicao_id', eleicao.id);

    const votosSimulados = [];
    for (let i = 1; i <= 20; i++) {
      const candidatoAleatorio = candidatosList[Math.floor(Math.random() * candidatosList.length)];
      
      votosSimulados.push({
        eleitor_matricula: String(i).padStart(8, '0'),
        candidato_id: candidatoAleatorio.id,
        tipo_voto: 'candidato',
        eleicao_id: eleicao.id,
        hash_verificacao: `hash-${Date.now()}-${i}`
      });
    }

    // Adicionar alguns votos nulos e brancos
    votosSimulados.push(
      {
        eleitor_matricula: '00000021',
        candidato_id: null,
        tipo_voto: 'nulo',
        eleicao_id: eleicao.id,
        hash_verificacao: `hash-${Date.now()}-nulo`
      },
      {
        eleitor_matricula: '00000022',
        candidato_id: null,
        tipo_voto: 'branco',
        eleicao_id: eleicao.id,
        hash_verificacao: `hash-${Date.now()}-branco`
      }
    );

    const { error: votosError } = await supabase
      .from('votos')
      .insert(votosSimulados);

    if (votosError) throw votosError;

    logger.info('✅ Votos simulados criados');

    logger.info('🎉 Dados de exemplo criados com sucesso!');
    logger.info('📋 Dados criados:');
    logger.info(`   - Eleição: ${eleicao.titulo}`);
    logger.info(`   - Candidatos: ${candidatos.length}`);
    logger.info(`   - Urnas: ${urnas.length}`);
    logger.info(`   - Eleitores: ${eleitores.length}`);
    logger.info(`   - Votos simulados: ${votosSimulados.length}`);
    logger.info('');
    logger.info('👤 Usuários de teste:');
    logger.info('   - admin@urna.com (senha: admin123) - Administrador');
    logger.info('   - operador@urna.com (senha: 123456) - Operador');

  } catch (error) {
    logger.error('❌ Erro ao criar dados de exemplo:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  criarDadosExemplo().then(() => {
    process.exit(0);
  });
}

module.exports = criarDadosExemplo;
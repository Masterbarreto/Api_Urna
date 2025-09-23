require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para criar dados de exemplo
const seedData = async () => {
  try {
    console.log('🌱 Criando dados de exemplo...');

    // 1. Criar usuário administrador
    const senhaAdmin = await bcrypt.hash('admin123', 12);
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .upsert([
        {
          nome: 'Administrador',
          email: 'admin@urna.com',
          senha_hash: senhaAdmin,
          tipo: 'admin',
          ativo: true
        }
      ], { onConflict: 'email' })
      .select('id')
      .single();

    if (adminError && adminError.code !== '23505') { // 23505 = unique violation
      throw adminError;
    }

    console.log('✅ Usuário administrador criado');

    // 2. Criar eleição de exemplo
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 7); // Eleição durará 7 dias

    const { data: eleicao, error: eleicaoError } = await supabase
      .from('eleicoes')
      .upsert([
        {
          titulo: 'Eleição de Exemplo 2024',
          descricao: 'Eleição criada automaticamente para demonstração do sistema',
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          status: 'ativa',
          criada_por: admin?.id
        }
      ], { onConflict: 'titulo' })
      .select('id')
      .single();

    if (eleicaoError && eleicaoError.code !== '23505') {
      throw eleicaoError;
    }

    const eleicaoId = eleicao?.id;
    console.log('✅ Eleição de exemplo criada');

    // 3. Criar urnas de exemplo
    const urnas = [
      { numero: 'URN001', localizacao: 'Seção 001 - Prédio Principal' },
      { numero: 'URN002', localizacao: 'Seção 002 - Biblioteca' },
      { numero: 'URN003', localizacao: 'Seção 003 - Laboratório' }
    ];

    for (const urna of urnas) {
      await supabase
        .from('urnas')
        .upsert([
          {
            ...urna,
            status: 'ativa',
            eleicao_id: eleicaoId
          }
        ], { onConflict: 'numero' });
    }

    console.log('✅ Urnas de exemplo criadas');

    // 4. Criar candidatos de exemplo
    const candidatos = [
      { numero: '10', nome: 'João Silva', partido: 'Partido A' },
      { numero: '20', nome: 'Maria Santos', partido: 'Partido B' },
      { numero: '30', nome: 'Pedro Oliveira', partido: 'Partido C' },
      { numero: '40', nome: 'Ana Costa', partido: 'Partido D' }
    ];

    for (const candidato of candidatos) {
      await supabase
        .from('candidatos')
        .upsert([
          {
            ...candidato,
            eleicao_id: eleicaoId
          }
        ], { onConflict: 'numero,eleicao_id' });
    }

    console.log('✅ Candidatos de exemplo criados');

    // 5. Criar eleitores de exemplo
    const eleitores = [
      { matricula: '001', nome: 'Carlos Rodrigues', cpf: '12345678901', email: 'carlos@email.com' },
      { matricula: '002', nome: 'Fernanda Lima', cpf: '23456789012', email: 'fernanda@email.com' },
      { matricula: '003', nome: 'Roberto Alves', cpf: '34567890123', email: 'roberto@email.com' },
      { matricula: '004', nome: 'Julia Mendes', cpf: '45678901234', email: 'julia@email.com' },
      { matricula: '005', nome: 'Marcos Silva', cpf: '56789012345', email: 'marcos@email.com' }
    ];

    for (const eleitor of eleitores) {
      await supabase
        .from('eleitores')
        .upsert([
          {
            ...eleitor,
            eleicao_id: eleicaoId
          }
        ], { onConflict: 'matricula,eleicao_id' });
    }

    console.log('✅ Eleitores de exemplo criados');

    // 6. Atualizar contadores da eleição
    await supabase
      .from('eleicoes')
      .update({
        total_eleitores: eleitores.length
      })
      .eq('id', eleicaoId);

    console.log('✅ Dados de exemplo criados com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('Email: admin@urna.com');
    console.log('Senha: admin123');
    console.log('\n🗳️ Eleitores de teste:');
    eleitores.forEach(e => console.log(`Matrícula: ${e.matricula} - ${e.nome}`));

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
    throw error;
  }
};

// Função principal
const main = async () => {
  try {
    await seedData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na criação dos dados:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { seedData };
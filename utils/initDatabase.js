require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

// SQL para criação das tabelas
const createTables = async () => {
  console.log('🔧 Iniciando criação das tabelas...');

  const sql = `
    -- Criar tabela de usuários
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      senha_hash VARCHAR(255) NOT NULL,
      tipo VARCHAR(50) DEFAULT 'operador' CHECK (tipo IN ('admin', 'operador')),
      ativo BOOLEAN DEFAULT true,
      ultimo_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar tabela de eleições
    CREATE TABLE IF NOT EXISTS eleicoes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
      data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) DEFAULT 'criada' CHECK (status IN ('criada', 'ativa', 'finalizada', 'cancelada')),
      total_votos INTEGER DEFAULT 0,
      total_eleitores INTEGER DEFAULT 0,
      criada_por UUID REFERENCES usuarios(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar tabela de urnas
    CREATE TABLE IF NOT EXISTS urnas (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      numero VARCHAR(50) UNIQUE NOT NULL,
      localizacao VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'manutencao')),
      ip_address INET,
      eleicao_id UUID REFERENCES eleicoes(id) ON DELETE SET NULL,
      ultimo_ping TIMESTAMP WITH TIME ZONE,
      total_votos INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar tabela de candidatos
    CREATE TABLE IF NOT EXISTS candidatos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      numero VARCHAR(10) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      partido VARCHAR(100) NOT NULL,
      foto_url VARCHAR(500),
      eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
      total_votos INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(numero, eleicao_id)
    );

    -- Criar tabela de eleitores
    CREATE TABLE IF NOT EXISTS eleitores (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      matricula VARCHAR(50) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      cpf VARCHAR(11) NOT NULL,
      email VARCHAR(255),
      telefone VARCHAR(20),
      eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
      ja_votou BOOLEAN DEFAULT false,
      horario_voto TIMESTAMP WITH TIME ZONE,
      urna_voto_id UUID REFERENCES urnas(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(matricula, eleicao_id),
      UNIQUE(cpf, eleicao_id)
    );

    -- Criar tabela de votos
    CREATE TABLE IF NOT EXISTS votos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      eleitor_matricula VARCHAR(50) NOT NULL,
      candidato_id UUID REFERENCES candidatos(id),
      eleicao_id UUID REFERENCES eleicoes(id) ON DELETE CASCADE,
      urna_id UUID REFERENCES urnas(id),
      tipo_voto VARCHAR(20) NOT NULL CHECK (tipo_voto IN ('candidato', 'nulo', 'branco')),
      hash_verificacao VARCHAR(255),
      ip_address INET,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar tabela de logs de auditoria
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      usuario_id UUID REFERENCES usuarios(id),
      acao VARCHAR(100) NOT NULL,
      tabela_afetada VARCHAR(100),
      registro_id UUID,
      dados_anteriores JSONB,
      dados_novos JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_eleicoes_status ON eleicoes(status);
    CREATE INDEX IF NOT EXISTS idx_urnas_eleicao ON urnas(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_candidatos_eleicao ON candidatos(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_eleitores_eleicao ON eleitores(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_eleitores_matricula ON eleitores(matricula);
    CREATE INDEX IF NOT EXISTS idx_votos_eleicao ON votos(eleicao_id);
    CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs_auditoria(created_at);

    -- Triggers para updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_eleicoes_updated_at BEFORE UPDATE ON eleicoes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_urnas_updated_at BEFORE UPDATE ON urnas
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_candidatos_updated_at BEFORE UPDATE ON candidatos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_eleitores_updated_at BEFORE UPDATE ON eleitores
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) throw error;
    console.log('✅ Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    throw error;
  }
};

// Função principal
const initDatabase = async () => {
  try {
    console.log('🚀 Inicializando banco de dados...');
    await createTables();
    console.log('✅ Banco de dados inicializado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
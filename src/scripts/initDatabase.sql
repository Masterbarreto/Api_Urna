-- Script de inicialização do banco de dados para Urna Eletrônica
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários do sistema (administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'admin' CHECK (tipo IN ('admin', 'operador')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de eleições
CREATE TABLE IF NOT EXISTS eleicoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'criada' CHECK (status IN ('criada', 'ativa', 'finalizada', 'cancelada')),
    total_votos INTEGER DEFAULT 0,
    total_eleitores INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_data_fim_maior CHECK (data_fim > data_inicio)
);

-- Tabela de urnas
CREATE TABLE IF NOT EXISTS urnas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'manutencao')),
    ip_address INET,
    ultimo_ping TIMESTAMP WITH TIME ZONE,
    total_votos INTEGER DEFAULT 0,
    eleicao_id UUID REFERENCES eleicoes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de candidatos
CREATE TABLE IF NOT EXISTS candidatos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero VARCHAR(10) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    partido VARCHAR(100) NOT NULL,
    foto_url TEXT,
    total_votos INTEGER DEFAULT 0,
    eleicao_id UUID NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(numero, eleicao_id)
);

-- Tabela de eleitores
CREATE TABLE IF NOT EXISTS eleitores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    ja_votou BOOLEAN DEFAULT false,
    data_voto TIMESTAMP WITH TIME ZONE,
    eleicao_id UUID NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matricula, eleicao_id),
    UNIQUE(cpf, eleicao_id)
);

-- Tabela de votos
CREATE TABLE IF NOT EXISTS votos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eleitor_matricula VARCHAR(20) NOT NULL,
    candidato_id UUID REFERENCES candidatos(id) ON DELETE SET NULL,
    tipo_voto VARCHAR(20) DEFAULT 'candidato' CHECK (tipo_voto IN ('candidato', 'nulo', 'branco')),
    eleicao_id UUID NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    urna_id UUID REFERENCES urnas(id) ON DELETE SET NULL,
    data_voto TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hash_verificacao VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_id UUID,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_eleicoes_status ON eleicoes(status);
CREATE INDEX IF NOT EXISTS idx_eleicoes_data_inicio ON eleicoes(data_inicio);
CREATE INDEX IF NOT EXISTS idx_urnas_status ON urnas(status);
CREATE INDEX IF NOT EXISTS idx_urnas_eleicao ON urnas(eleicao_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_eleicao ON candidatos(eleicao_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_numero ON candidatos(numero, eleicao_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_eleicao ON eleitores(eleicao_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_matricula ON eleitores(matricula, eleicao_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_ja_votou ON eleitores(ja_votou);
CREATE INDEX IF NOT EXISTS idx_votos_eleicao ON votos(eleicao_id);
CREATE INDEX IF NOT EXISTS idx_votos_candidato ON votos(candidato_id);
CREATE INDEX IF NOT EXISTS idx_votos_data ON votos(data_voto);
CREATE INDEX IF NOT EXISTS idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_logs_data ON logs_auditoria(created_at);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
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

-- Função para atualizar contadores de votos
CREATE OR REPLACE FUNCTION atualizar_contadores_voto()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar contador do candidato (se não for nulo/branco)
    IF NEW.candidato_id IS NOT NULL THEN
        UPDATE candidatos 
        SET total_votos = total_votos + 1
        WHERE id = NEW.candidato_id;
    END IF;
    
    -- Atualizar contador da eleição
    UPDATE eleicoes 
    SET total_votos = total_votos + 1
    WHERE id = NEW.eleicao_id;
    
    -- Atualizar contador da urna (se especificada)
    IF NEW.urna_id IS NOT NULL THEN
        UPDATE urnas 
        SET total_votos = total_votos + 1
        WHERE id = NEW.urna_id;
    END IF;
    
    -- Marcar eleitor como já votou
    UPDATE eleitores 
    SET ja_votou = true, data_voto = NEW.data_voto
    WHERE matricula = NEW.eleitor_matricula AND eleicao_id = NEW.eleicao_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar contadores ao inserir voto
CREATE TRIGGER trigger_atualizar_contadores_voto
    AFTER INSERT ON votos
    FOR EACH ROW EXECUTE FUNCTION atualizar_contadores_voto();

-- Inserir usuário administrador padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, tipo) 
VALUES (
    'Administrador',
    'admin@urna.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBw4ZRQ1RNkB1G',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Views para relatórios
CREATE OR REPLACE VIEW vw_resultados_eleicao AS
SELECT 
    e.id as eleicao_id,
    e.titulo as eleicao_titulo,
    c.id as candidato_id,
    c.numero as candidato_numero,
    c.nome as candidato_nome,
    c.partido as candidato_partido,
    c.total_votos,
    ROUND((c.total_votos * 100.0 / NULLIF(e.total_votos, 0)), 2) as percentual_votos
FROM eleicoes e
LEFT JOIN candidatos c ON e.id = c.eleicao_id
ORDER BY e.titulo, c.total_votos DESC;

CREATE OR REPLACE VIEW vw_estatisticas_urnas AS
SELECT 
    u.id as urna_id,
    u.numero as urna_numero,
    u.localizacao,
    u.status,
    u.total_votos,
    e.titulo as eleicao_titulo,
    CASE 
        WHEN u.ultimo_ping > NOW() - INTERVAL '5 minutes' THEN 'online'
        ELSE 'offline'
    END as status_conexao
FROM urnas u
LEFT JOIN eleicoes e ON u.eleicao_id = e.id;

-- Políticas RLS (Row Level Security) - Opcional, dependendo dos requisitos
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE eleicoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE eleitores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE votos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;
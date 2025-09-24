const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');

// Validação das variáveis de ambiente
if (!process.env.SUPABASE_URL) {
  logger.error('SUPABASE_URL não está definida nas variáveis de ambiente');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  logger.error('SUPABASE_ANON_KEY não está definida nas variáveis de ambiente');
  process.exit(1);
}

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Para APIs, não precisamos persistir sessões
  }
});

// Cliente com privilégios de service role (para operações administrativas)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Função para testar a conexão
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabela não encontrada (ok para primeira execução)
      throw error;
    }
    
    logger.info('✅ Conexão com Supabase estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('❌ Erro ao conectar com Supabase:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};
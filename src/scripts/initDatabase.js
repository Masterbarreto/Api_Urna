require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const initDatabase = async () => {
  try {
    logger.info('🚀 Iniciando configuração do banco de dados...');
    
    if (!supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada');
    }

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'initDatabase.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    logger.info(`📝 Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command) {
        try {
          await supabaseAdmin.rpc('exec_sql', { sql_query: command });
          logger.info(`✅ Comando ${i + 1}/${sqlCommands.length} executado com sucesso`);
        } catch (error) {
          // Alguns erros são esperados (como tabelas já existentes)
          if (error.message.includes('already exists')) {
            logger.warn(`⚠️ Comando ${i + 1}: ${error.message}`);
          } else {
            logger.error(`❌ Erro no comando ${i + 1}: ${error.message}`);
            throw error;
          }
        }
      }
    }

    // Verificar se as tabelas foram criadas
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['usuarios', 'eleicoes', 'candidatos', 'eleitores', 'votos', 'urnas', 'logs_auditoria']);

    if (tablesError) {
      throw tablesError;
    }

    logger.info(`✅ Banco de dados inicializado com sucesso!`);
    logger.info(`📊 Tabelas criadas: ${tables.map(t => t.table_name).join(', ')}`);
    
    // Verificar usuário admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('email')
      .eq('email', 'admin@urna.com')
      .single();

    if (adminError && adminError.code !== 'PGRST116') {
      throw adminError;
    }

    if (adminUser) {
      logger.info('👤 Usuário administrador padrão criado: admin@urna.com (senha: admin123)');
    }

    logger.info('🎉 Configuração concluída! A API está pronta para uso.');
    
  } catch (error) {
    logger.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = initDatabase;
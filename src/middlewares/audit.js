const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// Middleware para logging de auditoria
const auditLogger = (acao) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    // Capturar dados antes da operação
    const dadosAntigos = req.method === 'PUT' && req.params.id ? 
      await capturarDadosAntigos(req) : null;

    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Log da operação
      registrarAuditoria({
        req,
        res,
        acao,
        dadosAntigos,
        responseTime,
        responseData: data
      });

      originalSend.call(this, data);
    };

    next();
  };
};

// Função para capturar dados antes da modificação
const capturarDadosAntigos = async (req) => {
  try {
    const tabela = obterNomeTabela(req.route.path);
    if (!tabela || !req.params.id) return null;

    const { data } = await supabase
      .from(tabela)
      .select('*')
      .eq('id', req.params.id)
      .single();

    return data;
  } catch (error) {
    logger.error('Erro ao capturar dados antigos para auditoria:', error);
    return null;
  }
};

// Função para determinar o nome da tabela baseado na rota
const obterNomeTabela = (routePath) => {
  if (routePath.includes('/urnas')) return 'urnas';
  if (routePath.includes('/eleicoes')) return 'eleicoes';
  if (routePath.includes('/candidatos')) return 'candidatos';
  if (routePath.includes('/eleitores')) return 'eleitores';
  if (routePath.includes('/usuarios')) return 'usuarios';
  return null;
};

// Função para registrar a auditoria
const registrarAuditoria = async ({
  req,
  res,
  acao,
  dadosAntigos,
  responseTime,
  responseData
}) => {
  try {
    const usuario_id = req.user?.id || null;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');
    const tabela_afetada = obterNomeTabela(req.route?.path || '');
    
    let registro_id = null;
    let dados_novos = null;

    // Tentar extrair ID do registro e dados novos da resposta
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const parsedResponse = typeof responseData === 'string' ? 
          JSON.parse(responseData) : responseData;
        
        if (parsedResponse.data?.id) {
          registro_id = parsedResponse.data.id;
        }
        
        if (req.method === 'POST' || req.method === 'PUT') {
          dados_novos = parsedResponse.data;
        }
      } catch (parseError) {
        // Ignorar erros de parsing
      }
    }

    // Registrar no banco de dados
    await supabase
      .from('logs_auditoria')
      .insert({
        usuario_id,
        acao: `${req.method} ${acao}`,
        tabela_afetada,
        registro_id,
        dados_antigos: dadosAntigos,
        dados_novos,
        ip_address,
        user_agent
      });

    logger.info(`Auditoria registrada: ${req.method} ${acao} - Usuário: ${usuario_id} - IP: ${ip_address} - Tempo: ${responseTime}ms`);

  } catch (error) {
    logger.error('Erro ao registrar auditoria:', error);
  }
};

module.exports = {
  auditLogger
};
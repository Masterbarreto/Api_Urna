const { supabase } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Controller para listar logs de auditoria
const listarLogsAuditoria = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      acao, 
      usuario_id, 
      tabela_afetada,
      data_inicio,
      data_fim
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = supabase
      .from('logs_auditoria')
      .select(`
        id,
        acao,
        tabela_afetada,
        registro_id,
        dados_antigos,
        dados_novos,
        ip_address,
        user_agent,
        created_at,
        usuarios(nome, email)
      `, { count: 'exact' });

    // Aplicar filtros
    if (acao) {
      query = query.ilike('acao', `%${acao}%`);
    }

    if (usuario_id) {
      query = query.eq('usuario_id', usuario_id);
    }

    if (tabela_afetada) {
      query = query.eq('tabela_afetada', tabela_afetada);
    }

    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }

    if (data_fim) {
      query = query.lte('created_at', data_fim);
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: logs, error, count } = await query;

    if (error) throw error;

    // Formatar dados para melhor legibilidade
    const logsFormatados = logs?.map(log => ({
      id: log.id,
      acao: log.acao,
      tabelaAfetada: log.tabela_afetada,
      registroId: log.registro_id,
      usuario: log.usuarios ? {
        nome: log.usuarios.nome,
        email: log.usuarios.email
      } : null,
      dadosAntigos: log.dados_antigos,
      dadosNovos: log.dados_novos,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      dataHora: log.created_at,
      dataHoraFormatada: new Date(log.created_at).toLocaleString('pt-BR')
    })) || [];

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };

    return successResponse(res, {
      logs: logsFormatados,
      pagination
    }, 'Logs de auditoria listados com sucesso');

  } catch (error) {
    logger.error('Erro ao listar logs de auditoria:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter estatísticas de auditoria
const obterEstatisticasAuditoria = async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    // Query base para estatísticas
    let queryBase = supabase.from('logs_auditoria');

    if (data_inicio) {
      queryBase = queryBase.gte('created_at', data_inicio);
    }

    if (data_fim) {
      queryBase = queryBase.lte('created_at', data_fim);
    }

    // Buscar estatísticas em paralelo
    const [
      { data: acoesMaisComuns },
      { data: tabelasMaisAfetadas },
      { data: usuariosMaisAtivos },
      { data: atividade24h }
    ] = await Promise.all([
      // Ações mais comuns
      queryBase
        .select('acao')
        .then(({ data }) => {
          const contadores = {};
          data?.forEach(log => {
            contadores[log.acao] = (contadores[log.acao] || 0) + 1;
          });
          return Object.entries(contadores)
            .map(([acao, count]) => ({ acao, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }),

      // Tabelas mais afetadas
      queryBase
        .select('tabela_afetada')
        .then(({ data }) => {
          const contadores = {};
          data?.forEach(log => {
            if (log.tabela_afetada) {
              contadores[log.tabela_afetada] = (contadores[log.tabela_afetada] || 0) + 1;
            }
          });
          return Object.entries(contadores)
            .map(([tabela, count]) => ({ tabela, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }),

      // Usuários mais ativos
      supabase
        .from('logs_auditoria')
        .select(`
          usuario_id,
          usuarios(nome, email)
        `)
        .not('usuario_id', 'is', null)
        .then(({ data }) => {
          const contadores = {};
          data?.forEach(log => {
            if (log.usuario_id) {
              const key = log.usuario_id;
              if (!contadores[key]) {
                contadores[key] = {
                  usuario_id: log.usuario_id,
                  nome: log.usuarios?.nome || 'N/A',
                  email: log.usuarios?.email || 'N/A',
                  count: 0
                };
              }
              contadores[key].count++;
            }
          });
          return Object.values(contadores)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }),

      // Atividade nas últimas 24 horas
      supabase
        .from('logs_auditoria')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .then(({ data }) => {
          const horasAtividade = {};
          data?.forEach(log => {
            const hora = new Date(log.created_at).getHours();
            horasAtividade[hora] = (horasAtividade[hora] || 0) + 1;
          });
          
          // Preencher todas as 24 horas
          const atividade = [];
          for (let i = 0; i < 24; i++) {
            atividade.push({
              hora: i,
              count: horasAtividade[i] || 0
            });
          }
          return atividade;
        })
    ]);

    const estatisticas = {
      acoesMaisComuns: acoesMaisComuns || [],
      tabelasMaisAfetadas: tabelasMaisAfetadas || [],
      usuariosMaisAtivos: usuariosMaisAtivos || [],
      atividade24h: atividade24h || [],
      ultimaAtualizacao: new Date().toISOString()
    };

    return successResponse(res, estatisticas, 'Estatísticas de auditoria obtidas com sucesso');

  } catch (error) {
    logger.error('Erro ao obter estatísticas de auditoria:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter detalhes de um log específico
const obterLogAuditoria = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabase
      .from('logs_auditoria')
      .select(`
        id,
        acao,
        tabela_afetada,
        registro_id,
        dados_antigos,
        dados_novos,
        ip_address,
        user_agent,
        created_at,
        usuarios(nome, email, tipo)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 'Log de auditoria não encontrado', 404);
      }
      throw error;
    }

    // Formatar dados
    const logFormatado = {
      id: log.id,
      acao: log.acao,
      tabelaAfetada: log.tabela_afetada,
      registroId: log.registro_id,
      usuario: log.usuarios ? {
        nome: log.usuarios.nome,
        email: log.usuarios.email,
        tipo: log.usuarios.tipo
      } : null,
      dadosAntigos: log.dados_antigos,
      dadosNovos: log.dados_novos,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      dataHora: log.created_at,
      dataHoraFormatada: new Date(log.created_at).toLocaleString('pt-BR')
    };

    return successResponse(res, logFormatado, 'Log de auditoria obtido com sucesso');

  } catch (error) {
    logger.error('Erro ao obter log de auditoria:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  listarLogsAuditoria,
  obterEstatisticasAuditoria,
  obterLogAuditoria
};
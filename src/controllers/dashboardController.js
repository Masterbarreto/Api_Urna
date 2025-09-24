const { supabase } = require('../../api/config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Controller para obter estatísticas do dashboard
const getDashboardSummary = async (req, res) => {
  try {
    // Buscar eleição ativa
    const { data: eleicaoAtiva, error: eleicaoError } = await supabase
      .from('eleicoes')
      .select('id, titulo, data_inicio, data_fim, total_votos, total_eleitores')
      .eq('status', 'ativa')
      .single();

    if (eleicaoError && eleicaoError.code !== 'PGRST116') {
      throw eleicaoError;
    }

    let estatisticas = {
      eleicaoAtiva: null,
      totalVotos: 0,
      totalEleitores: 0,
      percentualParticipacao: 0,
      urnasOnline: 0,
      totalUrnas: 0,
      horaUltimaAtualizacao: new Date().toISOString()
    };

    if (eleicaoAtiva) {
      // Estatísticas da eleição ativa
      const [
        { data: urnas },
        { data: resultadosVotos },
        { data: eleitoresStats }
      ] = await Promise.all([
        // Contar urnas e status
        supabase
          .from('urnas')
          .select('id, status, ultimo_ping')
          .eq('eleicao_id', eleicaoAtiva.id),
        
        // Contar votos por tipo
        supabase
          .from('votos')
          .select('tipo_voto')
          .eq('eleicao_id', eleicaoAtiva.id),
          
        // Estatísticas de eleitores
        supabase
          .from('eleitores')
          .select('ja_votou')
          .eq('eleicao_id', eleicaoAtiva.id)
      ]);

      // Calcular urnas online (último ping há menos de 5 minutos)
      const agora = new Date();
      const urnasOnline = urnas?.filter(urna => {
        if (!urna.ultimo_ping) return false;
        const ultimoPing = new Date(urna.ultimo_ping);
        const diferencaMinutos = (agora - ultimoPing) / (1000 * 60);
        return diferencaMinutos <= 5 && urna.status === 'ativa';
      }).length || 0;

      // Contar votos por tipo
      const totalVotos = resultadosVotos?.length || 0;
      const votosCandidato = resultadosVotos?.filter(v => v.tipo_voto === 'candidato').length || 0;
      const votosNulo = resultadosVotos?.filter(v => v.tipo_voto === 'nulo').length || 0;
      const votosBranco = resultadosVotos?.filter(v => v.tipo_voto === 'branco').length || 0;

      // Estatísticas de eleitores
      const totalEleitores = eleitoresStats?.length || 0;
      const eleitoresQueVotaram = eleitoresStats?.filter(e => e.ja_votou).length || 0;
      const percentualParticipacao = totalEleitores > 0 
        ? Math.round((eleitoresQueVotaram / totalEleitores) * 100 * 100) / 100 
        : 0;

      estatisticas = {
        eleicaoAtiva: {
          id: eleicaoAtiva.id,
          titulo: eleicaoAtiva.titulo,
          dataInicio: eleicaoAtiva.data_inicio,
          dataFim: eleicaoAtiva.data_fim
        },
        totalVotos,
        totalEleitores,
        eleitoresQueVotaram,
        percentualParticipacao,
        urnasOnline,
        totalUrnas: urnas?.length || 0,
        distribuicaoVotos: {
          candidatos: votosCandidato,
          nulos: votosNulo,
          brancos: votosBranco
        },
        horaUltimaAtualizacao: new Date().toISOString()
      };
    } else {
      // Se não há eleição ativa, buscar estatísticas gerais
      const [
        { count: totalEleitoresGeral },
        { count: totalUrnasGeral },
        { count: totalEleicoes }
      ] = await Promise.all([
        supabase.from('eleitores').select('*', { count: 'exact', head: true }),
        supabase.from('urnas').select('*', { count: 'exact', head: true }),
        supabase.from('eleicoes').select('*', { count: 'exact', head: true })
      ]);

      estatisticas.totalEleitores = totalEleitoresGeral || 0;
      estatisticas.totalUrnas = totalUrnasGeral || 0;
      estatisticas.totalEleicoes = totalEleicoes || 0;
    }

    logger.info('Estatísticas do dashboard obtidas com sucesso');

    return successResponse(res, estatisticas, 'Estatísticas obtidas com sucesso');

  } catch (error) {
    logger.error('Erro ao obter estatísticas do dashboard:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter gráfico de votos em tempo real
const getGraficoVotos = async (req, res) => {
  try {
    const { eleicaoId } = req.params;

    // Buscar candidatos e seus votos
    const { data: candidatos, error } = await supabase
      .from('candidatos')
      .select(`
        id,
        numero,
        nome,
        partido,
        total_votos
      `)
      .eq('eleicao_id', eleicaoId)
      .order('total_votos', { ascending: false });

    if (error) {
      throw error;
    }

    // Buscar votos especiais (nulo e branco)
    const { data: votosEspeciais, error: votosError } = await supabase
      .from('votos')
      .select('tipo_voto')
      .eq('eleicao_id', eleicaoId)
      .in('tipo_voto', ['nulo', 'branco']);

    if (votosError) {
      throw votosError;
    }

    const votosNulo = votosEspeciais?.filter(v => v.tipo_voto === 'nulo').length || 0;
    const votosBranco = votosEspeciais?.filter(v => v.tipo_voto === 'branco').length || 0;

    // Preparar dados para o gráfico
    const dadosGrafico = {
      candidatos: candidatos || [],
      votosEspeciais: {
        nulo: votosNulo,
        branco: votosBranco
      },
      timestamp: new Date().toISOString()
    };

    return successResponse(res, dadosGrafico, 'Dados do gráfico obtidos com sucesso');

  } catch (error) {
    logger.error('Erro ao obter dados do gráfico:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para obter status das urnas
const getStatusUrnas = async (req, res) => {
  try {
    const { data: urnas, error } = await supabase
      .from('urnas')
      .select(`
        id,
        numero,
        localizacao,
        status,
        ultimo_ping,
        total_votos,
        eleicoes(titulo)
      `)
      .order('numero');

    if (error) {
      throw error;
    }

    // Adicionar status de conexão
    const agora = new Date();
    const urnasComStatus = urnas?.map(urna => {
      let statusConexao = 'offline';
      
      if (urna.ultimo_ping) {
        const ultimoPing = new Date(urna.ultimo_ping);
        const diferencaMinutos = (agora - ultimoPing) / (1000 * 60);
        
        if (diferencaMinutos <= 5 && urna.status === 'ativa') {
          statusConexao = 'online';
        } else if (diferencaMinutos <= 15) {
          statusConexao = 'warning';
        }
      }

      return {
        ...urna,
        statusConexao,
        ultimoPingFormatado: urna.ultimo_ping ? 
          new Date(urna.ultimo_ping).toLocaleString('pt-BR') : 
          'Nunca conectou'
      };
    }) || [];

    return successResponse(res, urnasComStatus, 'Status das urnas obtido com sucesso');

  } catch (error) {
    logger.error('Erro ao obter status das urnas:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

module.exports = {
  getDashboardSummary,
  getGraficoVotos,
  getStatusUrnas
};
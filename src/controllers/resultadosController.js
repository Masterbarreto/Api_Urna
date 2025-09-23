const { supabase } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Controller para obter resultados de uma eleição
const obterResultados = async (req, res) => {
  try {
    const { eleicaoId } = req.params;

    // Buscar informações da eleição
    const { data: eleicao, error: eleicaoError } = await supabase
      .from('eleicoes')
      .select('id, titulo, descricao, data_inicio, data_fim, status, total_votos, total_eleitores')
      .eq('id', eleicaoId)
      .single();

    if (eleicaoError || !eleicao) {
      return errorResponse(res, 'Eleição não encontrada', 404);
    }

    // Buscar candidatos e seus votos
    const { data: candidatos, error: candidatosError } = await supabase
      .from('candidatos')
      .select('id, numero, nome, partido, total_votos')
      .eq('eleicao_id', eleicaoId)
      .order('total_votos', { ascending: false });

    if (candidatosError) throw candidatosError;

    // Buscar votos especiais (nulo e branco)
    const { data: votosEspeciais, error: votosError } = await supabase
      .from('votos')
      .select('tipo_voto')
      .eq('eleicao_id', eleicaoId)
      .in('tipo_voto', ['nulo', 'branco']);

    if (votosError) throw votosError;

    // Calcular estatísticas
    const votosNulo = votosEspeciais?.filter(v => v.tipo_voto === 'nulo').length || 0;
    const votosBranco = votosEspeciais?.filter(v => v.tipo_voto === 'branco').length || 0;
    const votosCandidatos = candidatos?.reduce((total, c) => total + c.total_votos, 0) || 0;
    const totalVotosContabilizados = votosCandidatos + votosNulo + votosBranco;

    // Calcular percentuais
    const candidatosComPercentual = candidatos?.map(candidato => ({
      ...candidato,
      percentual: totalVotosContabilizados > 0 
        ? Math.round((candidato.total_votos / totalVotosContabilizados) * 10000) / 100 
        : 0
    })) || [];

    // Buscar estatísticas de eleitores
    const { data: eleitoresStats, error: eleitoresError } = await supabase
      .from('eleitores')
      .select('ja_votou')
      .eq('eleicao_id', eleicaoId);

    if (eleitoresError) throw eleitoresError;

    const totalEleitoresHabilitados = eleitoresStats?.length || 0;
    const eleitoresQueVotaram = eleitoresStats?.filter(e => e.ja_votou).length || 0;
    const abstenções = totalEleitoresHabilitados - eleitoresQueVotaram;
    const percentualParticipacao = totalEleitoresHabilitados > 0 
      ? Math.round((eleitoresQueVotaram / totalEleitoresHabilitados) * 10000) / 100 
      : 0;

    // Buscar informações das urnas
    const { data: urnas, error: urnasError } = await supabase
      .from('urnas')
      .select('id, numero, localizacao, total_votos')
      .eq('eleicao_id', eleicaoId)
      .order('numero');

    if (urnasError) throw urnasError;

    const resultados = {
      eleicao,
      candidatos: candidatosComPercentual,
      votosEspeciais: {
        nulos: votosNulo,
        brancos: votosBranco,
        percentualNulos: totalVotosContabilizados > 0 
          ? Math.round((votosNulo / totalVotosContabilizados) * 10000) / 100 
          : 0,
        percentualBrancos: totalVotosContabilizados > 0 
          ? Math.round((votosBranco / totalVotosContabilizados) * 10000) / 100 
          : 0
      },
      estatisticas: {
        totalEleitoresHabilitados,
        eleitoresQueVotaram,
        abstenções,
        percentualParticipacao,
        totalVotosContabilizados
      },
      urnas: urnas || [],
      ultimaAtualizacao: new Date().toISOString()
    };

    logger.info(`Resultados obtidos para eleição ${eleicaoId}`);

    return successResponse(res, resultados, 'Resultados obtidos com sucesso');

  } catch (error) {
    logger.error('Erro ao obter resultados:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Controller para exportar resultados
const exportarResultados = async (req, res) => {
  try {
    const { eleicaoId } = req.params;
    const { formato = 'pdf' } = req.query;

    // Obter dados dos resultados
    const resultadosResponse = await obterResultados({ params: { eleicaoId } }, {
      status: () => ({ json: (data) => data })
    });

    if (resultadosResponse.status !== 'sucesso') {
      return errorResponse(res, 'Erro ao obter dados para exportação', 500);
    }

    const resultados = resultadosResponse.data;

    if (formato === 'pdf') {
      return await exportarPDF(res, resultados);
    } else if (formato === 'csv') {
      return await exportarCSV(res, resultados);
    } else {
      return errorResponse(res, 'Formato não suportado. Use "pdf" ou "csv"', 400);
    }

  } catch (error) {
    logger.error('Erro ao exportar resultados:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// Função para exportar PDF
const exportarPDF = async (res, resultados) => {
  try {
    const doc = new PDFDocument();
    const filename = `resultados-${resultados.eleicao.id}-${Date.now()}.pdf`;
    
    // Configurar cabeçalhos da resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe do documento para a resposta
    doc.pipe(res);

    // Título
    doc.fontSize(18).text('RELATÓRIO DE RESULTADOS ELEITORAIS', {
      align: 'center'
    });

    doc.moveDown();

    // Informações da eleição
    doc.fontSize(14).text(`Eleição: ${resultados.eleicao.titulo}`, { underline: true });
    doc.fontSize(12);
    doc.text(`Descrição: ${resultados.eleicao.descricao || 'N/A'}`);
    doc.text(`Período: ${new Date(resultados.eleicao.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(resultados.eleicao.data_fim).toLocaleDateString('pt-BR')}`);
    doc.text(`Status: ${resultados.eleicao.status.toUpperCase()}`);

    doc.moveDown();

    // Estatísticas gerais
    doc.fontSize(14).text('ESTATÍSTICAS GERAIS', { underline: true });
    doc.fontSize(12);
    doc.text(`Total de Eleitores Habilitados: ${resultados.estatisticas.totalEleitoresHabilitados}`);
    doc.text(`Eleitores que Votaram: ${resultados.estatisticas.eleitoresQueVotaram}`);
    doc.text(`Abstenções: ${resultados.estatisticas.abstenções}`);
    doc.text(`Percentual de Participação: ${resultados.estatisticas.percentualParticipacao}%`);
    doc.text(`Total de Votos Válidos: ${resultados.estatisticas.totalVotosContabilizados}`);

    doc.moveDown();

    // Resultados por candidato
    doc.fontSize(14).text('RESULTADOS POR CANDIDATO', { underline: true });
    doc.fontSize(12);

    resultados.candidatos.forEach((candidato, index) => {
      doc.text(`${index + 1}º - ${candidato.nome} (${candidato.partido})`);
      doc.text(`    Número: ${candidato.numero}`);
      doc.text(`    Votos: ${candidato.total_votos} (${candidato.percentual}%)`);
      doc.moveDown(0.5);
    });

    // Votos especiais
    doc.moveDown();
    doc.fontSize(14).text('VOTOS ESPECIAIS', { underline: true });
    doc.fontSize(12);
    doc.text(`Votos Nulos: ${resultados.votosEspeciais.nulos} (${resultados.votosEspeciais.percentualNulos}%)`);
    doc.text(`Votos em Branco: ${resultados.votosEspeciais.brancos} (${resultados.votosEspeciais.percentualBrancos}%)`);

    // Informações por urna
    if (resultados.urnas.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('RESULTADOS POR URNA', { underline: true });
      doc.fontSize(12);

      resultados.urnas.forEach(urna => {
        doc.text(`Urna ${urna.numero} - ${urna.localizacao}`);
        doc.text(`    Total de Votos: ${urna.total_votos}`);
        doc.moveDown(0.5);
      });
    }

    // Rodapé
    doc.moveDown();
    doc.fontSize(10).text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, {
      align: 'center'
    });

    doc.end();

    logger.info(`Relatório PDF gerado para eleição ${resultados.eleicao.id}`);

  } catch (error) {
    logger.error('Erro ao gerar PDF:', error);
    throw error;
  }
};

// Função para exportar CSV
const exportarCSV = async (res, resultados) => {
  try {
    const filename = `resultados-${resultados.eleicao.id}-${Date.now()}.csv`;
    
    // Configurar cabeçalhos da resposta
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Cabeçalho do CSV
    let csvContent = '\uFEFF'; // BOM para UTF-8
    csvContent += 'Posição,Número,Nome,Partido,Votos,Percentual\n';

    // Dados dos candidatos
    resultados.candidatos.forEach((candidato, index) => {
      csvContent += `${index + 1},${candidato.numero},"${candidato.nome}","${candidato.partido}",${candidato.total_votos},${candidato.percentual}%\n`;
    });

    // Adicionar votos especiais
    csvContent += `,,VOTOS NULOS,,${resultados.votosEspeciais.nulos},${resultados.votosEspeciais.percentualNulos}%\n`;
    csvContent += `,,VOTOS EM BRANCO,,${resultados.votosEspeciais.brancos},${resultados.votosEspeciais.percentualBrancos}%\n`;

    // Adicionar estatísticas
    csvContent += '\n\nESTATÍSTICAS GERAIS\n';
    csvContent += `Total de Eleitores Habilitados,${resultados.estatisticas.totalEleitoresHabilitados}\n`;
    csvContent += `Eleitores que Votaram,${resultados.estatisticas.eleitoresQueVotaram}\n`;
    csvContent += `Abstenções,${resultados.estatisticas.abstenções}\n`;
    csvContent += `Percentual de Participação,${resultados.estatisticas.percentualParticipacao}%\n`;

    res.send(csvContent);

    logger.info(`Relatório CSV gerado para eleição ${resultados.eleicao.id}`);

  } catch (error) {
    logger.error('Erro ao gerar CSV:', error);
    throw error;
  }
};

module.exports = {
  obterResultados,
  exportarResultados
};
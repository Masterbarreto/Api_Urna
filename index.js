const app = require('./api');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor da API da Urna Eletrônica rodando na porta ${PORT}`);
  console.log(`📊 Dashboard disponível em: http://localhost:${PORT}/api/dashboard`);
  console.log(`🗳️ Interface de votação em: http://localhost:${PORT}/api/urna-votacao`);
  console.log(`📚 Documentação da API em: http://localhost:${PORT}/api/docs`);
});
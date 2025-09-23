const { errorResponse } = require('../utils/helpers');

// Middleware para rotas não encontradas
const notFound = (req, res, next) => {
  const message = `Rota não encontrada: ${req.method} ${req.originalUrl}`;
  errorResponse(res, message, 404);
};

module.exports = notFound;
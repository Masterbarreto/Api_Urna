const { errorResponse } = require('../utils/helpers');

// Middleware para validação de schema Joi
const validateSchema = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return errorResponse(res, 'Dados inválidos', 400, errorMessages);
    }

    // Substituir os dados validados
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Middleware para validação de parâmetros UUID
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      return errorResponse(res, `ID inválido: ${paramName} deve ser um UUID válido`, 400);
    }
    
    next();
  };
};

// Middleware para validação de upload de arquivos
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next(); // Arquivo é opcional
    }

    // Verificar tipo de arquivo
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return errorResponse(res, `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`, 400);
    }

    // Verificar tamanho do arquivo
    if (req.file.size > maxSize) {
      return errorResponse(res, `Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`, 400);
    }

    next();
  };
};

module.exports = {
  validateSchema,
  validateUUID,
  validateFileUpload
};
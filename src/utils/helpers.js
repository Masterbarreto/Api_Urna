const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Gerar hash da senha
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Verificar senha
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Gerar JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Verificar JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Função para formatar resposta de sucesso
const successResponse = (res, data = null, message = 'Sucesso', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'sucesso',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Função para formatar resposta de erro
const errorResponse = (res, message = 'Erro interno do servidor', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    status: 'erro',
    message,
    details,
    timestamp: new Date().toISOString()
  });
};

// Função para gerar código de auditoria
const generateAuditCode = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Função para validar UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Função para sanitizar entrada de texto
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Função para formatar número de eleitor/candidato
const formatNumber = (number) => {
  return number.toString().padStart(5, '0');
};

// Função para validar CPF
const isValidCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  successResponse,
  errorResponse,
  generateAuditCode,
  isValidUUID,
  sanitizeInput,
  formatNumber,
  isValidCPF
};
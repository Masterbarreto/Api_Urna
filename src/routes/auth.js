const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { validateSchema } = require('../middlewares/validation');
const { authenticateToken } = require('../middlewares/auth');
const { loginSchema } = require('../utils/validation');

// Rota de login - POST /api/v1/auth/login
router.post('/login', 
  validateSchema(loginSchema),
  authController.login
);

// Rota para obter dados do usuário logado - GET /api/v1/auth/me
router.get('/me', 
  authenticateToken,
  authController.getMe
);

// Rota de logout - POST /api/v1/auth/logout
router.post('/logout', 
  authenticateToken,
  authController.logout
);

// Rota para refresh token - POST /api/v1/auth/refresh
router.post('/refresh', 
  authenticateToken,
  authController.refreshToken
);

module.exports = router;
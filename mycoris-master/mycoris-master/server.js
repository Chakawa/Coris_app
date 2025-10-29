const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes'); 
// SUPPRIMEZ CETTE LIGNE : const subscriptionController = require('../controllers/subscriptionController');

const app = express();

// Middleware critiques
app.use(cors({
  origin: ['http://localhost', 'http://10.0.2.2',  'http://192.168.1.32'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route de base
app.get('/', (_, res) => res.json({ 
  status: 'running',
  message: 'API MyCorisLife OK',
  timestamp: new Date().toISOString()
}));

// Routes d'authentification
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/uploads', require('./routes/uploads'));
app.get('/health', (_,res)=>res.json({ ok:true, ts: Date.now() }));

// Route de test de la base de données
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    res.json({ 
      status: 'success',
      dbTime: result.rows[0].current_time,
      dbVersion: (await pool.query('SELECT version()')).rows[0].version
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(503).json({ 
      status: 'error',
      message: 'Database unreachable',
      error: error.message
    });
  }
});

// Gestion des 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// Gestion centrale des erreurs
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Configuration du serveur
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Accessible depuis votre téléphone: http://192.168.146.19:${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/test-db`);
});

// Gestion propre des arrêts
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Import de la connexion DB
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Import du contrôleur (optionnel)
let authController;
try {
  authController = require('../controllers/authController');
} catch (error) {
  console.log('AuthController non trouvé, utilisation des routes directes');
}

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    if (authController) {
      const user = await authController.registerClient(req.body);
      res.status(201).json({ success: true, user });
    } else {
      // Implémentation basique si pas de contrôleur
      const { email, password, nom, prenom } = req.body;
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, nom, prenom, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nom, prenom, role',
        [email, passwordHash, nom, prenom, 'client']
      );
      
      res.status(201).json({ success: true, user: result.rows[0] });
    }
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  console.log('🔐 Tentative de connexion...');
  try {
    if (authController) {
      const { email, password } = req.body;
      const result = await authController.login(email, password);
      res.json({ success: true, ...result });
    } else {
      const { email, password } = req.body;
      
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      }
      
      const user = userResult.rows[0];
      const bcrypt = require('bcrypt');
      const jwt = require('jsonwebtoken');
      
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role }
      });
    }
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(401).json({ success: false, message: error.message });
  }
});

// 🎯 ROUTE PROFILE AVEC GESTION D'ERREUR ROBUSTE
router.get('/profile', verifyToken, async (req, res) => {
  console.log('=== ROUTE /profile APPELÉE ===');
  console.log('Headers:', req.headers.authorization);
  console.log('User depuis middleware:', req.user);
  
  try {
    const userId = req.user.id;
    console.log('🔍 Recherche utilisateur ID:', userId);
    
    // Requête SQL sécurisée avec gestion des valeurs NULL
    const query = `
      SELECT 
        id, 
        email, 
        COALESCE(nom, '') as nom, 
        COALESCE(prenom, '') as prenom,
        COALESCE(civilite, '') as civilite,
        date_naissance, 
        COALESCE(lieu_naissance, '') as lieu_naissance,
        COALESCE(telephone, '') as telephone,
        COALESCE(adresse, '') as adresse,
        COALESCE(pays, '') as pays,
        created_at
      FROM users 
      WHERE id = $1
    `;
    
    console.log('🔄 Exécution requête SQL...');
    const result = await pool.query(query, [userId]);
    console.log('📊 Nombre de résultats:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('❌ Aucun utilisateur trouvé');
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const userData = result.rows[0];
    console.log('✅ Données utilisateur récupérées:', {
      id: userData.id,
      email: userData.email,
      nom: userData.nom,
      prenom: userData.prenom
    });

    // Formater la date si elle existe
    if (userData.date_naissance) {
      userData.date_naissance = userData.date_naissance.toISOString().split('T')[0];
    }

    res.json({
      success: true,
      user: userData
    });
    
  } catch (error) {
    console.error('=== ERREUR ROUTE /profile ===');
    console.error('Type d\'erreur:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code SQL:', error.code);
    console.error('Stack complet:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        detail: error.detail
      } : 'Erreur interne'
    });
  }
});

module.exports = router;
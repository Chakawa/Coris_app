const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Détection du rôle améliorée
function detectUserRole(email) {
  email = email.toLowerCase();
  if (email.includes('adminvi25')) return 'admin';
  if (email.includes('coriscomvi25')) return 'commercial';
  return 'client';
}

// Validation des données utilisateur
function validateUserData(userData, isCommercial = false) {
  const { email, password, nom, prenom, telephone } = userData;
  
  if (!email || !password || !nom || !prenom || !telephone) {
    throw new Error('Tous les champs obligatoires doivent être remplis');
  }

  if (isCommercial && !userData.code_apporteur) {
    throw new Error('Le code apporteur est obligatoire pour les commerciaux');
  }

  const role = detectUserRole(email);
  if (isCommercial && role !== 'commercial') {
    throw new Error('L\'email commercial doit contenir "coriscomvi25"');
  }
}

// Inscription client
async function registerClient(userData) {
  validateUserData(userData);
  
  const role = detectUserRole(userData.email);
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const query = `
    INSERT INTO users (
      email, password_hash, role, nom, prenom, civilite, 
      date_naissance, lieu_naissance, telephone, adresse, pays
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, email, nom, prenom, role
  `;
  
  const values = [
    userData.email,
    passwordHash,
    role,
    userData.nom,
    userData.prenom,
    userData.civilite,
    userData.date_naissance,
    userData.lieu_naissance,
    userData.telephone,
    userData.adresse,
    userData.pays
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Création commercial (admin seulement)
async function registerCommercial(userData) {
  validateUserData(userData, true);
  
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const query = `
    INSERT INTO users (
      email, password_hash, role, nom, prenom, civilite,
      telephone, adresse, pays, code_apporteur
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, email, nom, prenom, role, code_apporteur
  `;
  
  const values = [
    userData.email,
    passwordHash,
    'commercial', 
    userData.nom,
    userData.prenom,
    userData.civilite,
    userData.telephone,
    userData.adresse,
    userData.pays,
    userData.code_apporteur
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Connexion
async function login(email, password) {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  
  if (result.rows.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordMatch) {
    throw new Error('Mot de passe incorrect');
  }
  
  // Ne retournez jamais le mot de passe dans le token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      code_apporteur: user.code_apporteur
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      code_apporteur: user.code_apporteur
    }
  };
}

module.exports = {
  registerClient,
  registerCommercial,
  login,
  detectUserRole
};
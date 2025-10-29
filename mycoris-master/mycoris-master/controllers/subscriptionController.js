const pool = require('../db');
const { generatePolicyNumber } = require('../utils/helpers');

// Créer une souscription
exports.createSubscription = async (req, res) => {
  try {
    const {
      product_type,
      ...subscriptionData
    } = req.body;

    const userId = req.user.id;
    
    // Générer un numéro de police unique
    const numeroPolice = await generatePolicyNumber(product_type);
    
    // Insérer la souscription dans la base de données
    const query = `
      INSERT INTO subscriptions (user_id, numero_police, produit_nom, souscriptiondata)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const values = [userId, numeroPolice, product_type, subscriptionData];
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: 'Souscription créée avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur création souscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la souscription'
    });
  }
};

// Mettre à jour le statut d'une souscription
exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const query = `
      UPDATE subscriptions 
      SET statut = $1, date_validation = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *;
    `;
    
    const values = [status, id, req.user.id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Souscription non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

// Uploader un document
exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier téléchargé'
      });
    }
    
    // Mettre à jour la souscription avec le chemin du document
    const query = `
      UPDATE subscriptions 
      SET souscriptiondata = jsonb_set(
        souscriptiondata, 
        '{piece_identite_path}', 
        $1
      )
      WHERE id = $2 AND user_id = $3
      RETURNING *;
    `;
    
    const values = [`"${req.file.path}"`, id, req.user.id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Souscription non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Document téléchargé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du document'
    });
  }
}; // ← ACCOLADE FERMANTE MANQUANTE AJOUTÉE ICI

// Récupérer les propositions d'un utilisateur connecté
exports.getUserPropositions = async (req, res) => {
  try {
    const userId = req.user.id; // récupéré depuis verifyToken
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND statut = 'proposition' ORDER BY date_creation DESC",
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Erreur getUserPropositions:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Récupérer les contrats d'un utilisateur connecté
exports.getUserContracts = async (req, res) => {
  try {
    const userId = req.user.id; // récupéré depuis verifyToken
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND statut = 'contrat' ORDER BY date_creation DESC",
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Erreur getUserContracts:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// AJOUTEZ LES FONCTIONS MANQUANTES (si elles sont utilisées dans les routes)
exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY date_creation DESC",
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Erreur getUserSubscriptions:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Souscription non trouvée'
      });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Erreur getSubscription:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
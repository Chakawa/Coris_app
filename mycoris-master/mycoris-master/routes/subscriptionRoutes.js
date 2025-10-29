const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');


const {
  createSubscription,
  updateSubscriptionStatus,
  uploadDocument,
  getUserPropositions,   
  getUserContracts      
} = require('../controllers/subscriptionController');

// Routes
router.post('/create', verifyToken, createSubscription);
router.put('/:id/status', verifyToken, updateSubscriptionStatus);
router.post('/:id/upload-document', verifyToken, upload.single('document'), uploadDocument);
router.get('/user/propositions', verifyToken, getUserPropositions);
router.get('/user/contrats', verifyToken, getUserContracts); 
module.exports = router;
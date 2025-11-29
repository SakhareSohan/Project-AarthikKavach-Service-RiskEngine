const express = require('express');
const AiRiskCoachController = require('../controllers/ai-risk-coach.controller');

const router = express.Router();

router.post('/chat', AiRiskCoachController.chat);
router.post('/clear-chat', AiRiskCoachController.clearChat);

module.exports = router;

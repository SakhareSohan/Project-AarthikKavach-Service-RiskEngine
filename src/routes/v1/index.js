const express = require('express');

const { InfoController } = require('../../controllers');
const aiRiskCoachRoutes = require('./ai-risk-coach.routes');

const router = express.Router();

router.get('/info', InfoController.info);
router.use('/risk-coach', aiRiskCoachRoutes);

module.exports = router;
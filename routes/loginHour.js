const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginHourController');

// Login/logout and break routes
router.post('/login', loginController.markLogin);
router.post('/logout', loginController.markLogout);
router.post('/break/start', loginController.startBreak);
router.post('/break/end', loginController.endBreak);

router.get('/today/:employeeId', loginController.getTodayStats);

module.exports = router;



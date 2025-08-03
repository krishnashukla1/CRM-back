const express = require('express');
const router = express.Router();
const { register, login,getAdminCount } = require('../controllers/authController');

router.post('/signup', register);
router.post('/login', login);
router.get('/admin-count', getAdminCount);
module.exports = router;

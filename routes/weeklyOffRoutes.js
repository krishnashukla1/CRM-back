const express = require('express');
const router = express.Router();
const weeklyOffController = require('../controllers/weeklyOffController');


router.get('/', weeklyOffController.getAllWeeklyOffs);
router.get('/:employeeId', weeklyOffController.getWeeklyOffsByEmployee);
router.post('/', weeklyOffController.createWeeklyOff);
router.put('/:employeeId', weeklyOffController.updateWeeklyOffByEmployeeId);
router.delete('/:employeeId', weeklyOffController.deleteWeeklyOffByEmployeeId);

module.exports = router;

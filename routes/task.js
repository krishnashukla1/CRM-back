// routes/tasks.js
const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTaskStatus
} = require('../controllers/taskController');

router.get('/', getAllTasks);
router.post('/', createTask);
router.patch('/:id/status', updateTaskStatus);

module.exports = router;

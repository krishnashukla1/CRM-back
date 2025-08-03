// controllers/taskController.js
const Task = require('../models/Task');

exports.getAllTasks = async (req, res) => {
  try {
    const { assignedTo, status, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    const totalCount = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Tasks fetched successfully',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};



exports.createTask = async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create task' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Task.findByIdAndUpdate(id, { status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update task status' });
  }
};

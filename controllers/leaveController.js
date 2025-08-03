
const Leave = require('../models/Leave');

exports.getAllLeaves = async (req, res) => {
  try {
    const { employeeId, status, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const totalCount = await Leave.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const leaves = await Leave.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ from: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Leave records fetched',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, leaveType } = req.body;

    const updateData = { status };
    if (leaveType) updateData.leaveType = leaveType;

    const updated = await Leave.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update leave status' });
  }
};



exports.requestLeave = async (req, res) => {
  try {
    // const { employeeId, from, to, reason } = req.body;
    const { employeeId, from, to, reason, leaveType = 'Paid Leave' } = req.body;

    const documentPath = req.file ? req.file.filename : null;

    const leave = new Leave({
      employeeId,
      from,
      to,
      reason,
      leaveType,
        isPaid: leaveType === 'Paid Leave', // ✅ Add this line
      document: documentPath,
    });

    await leave.save();
    res.status(201).json({ message: 'Leave request submitted', leave });
  } catch (err) {
    console.error('Leave request failed:', err);
    res.status(500).json({ message: 'Server error submitting leave' });
  }
};




//http://localhost:5000/uploads/documents/<filename>

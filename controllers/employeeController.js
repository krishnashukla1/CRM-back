const multer = require('multer');
const path = require('path');
const Employee = require("../models/Employee");
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave')
const mongoose =require('mongoose')


exports.getAllEmployees = async (req, res) => {
  try {
    const { search = '', page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const totalCount = await Employee.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const employees = await Employee.find(filter)
      // .sort({ name: 1 })
        .select('name email role status photo dateOfJoining salary') // ✅ include salary
       .sort({ createdAt: -1 })  // ✅ shows latest created first
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Employees fetched successfully',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: employees,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};


exports.addEmployee = async (req, res) => {
  try {
    const { name, role, email, dateOfJoining ,salary} = req.body;

    const photo = req.file ? req.file.filename : null;

    const newEmp = new Employee({
      name,
      role,
      email,
      photo,
      salary,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
    });

    await newEmp.save();
    res.status(201).json(newEmp);
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(500).json({ message: 'Failed to create employee' });
  }
};


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `employee_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ✅ Export correctly
exports.upload = upload.single('photo'); // middleware
exports.uploadEmployeePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const employeeId = req.params.id;
    const updated = await Employee.findByIdAndUpdate(
      employeeId,
      { photo: req.file.filename },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Photo uploaded and saved',
      filename: req.file.filename,
      employee: updated,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Photo upload failed' });
  }
};


exports.getSalaryByMonth = async (req, res) => {
  const { employeeId, month } = req.params;

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const salary = employee.salary;
    const perDaySalary = salary / 30;

    const start = new Date(`${month}-01`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    // 1. Get Present Days from Attendance
    const presentAttendance = await Attendance.find({
      employeeId,
      date: { $gte: start, $lt: end },
      status: 'Present'
    });

    const presentDays = presentAttendance.length;

    // 2. Get Approved Leaves in Month
    const allLeaves = await Leave.find({
      employeeId,
      status: 'Approved',
      from: { $lte: end },
      to: { $gte: start }
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    allLeaves.forEach((leave) => {
      const leaveStart = new Date(leave.from) < start ? start : new Date(leave.from);
      const leaveEnd = new Date(leave.to) > end ? end : new Date(leave.to);

      const days = Math.floor((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

      if (leave.lwp) {
        unpaidLeaveDays += days;
      } else {
        paidLeaveDays += days;
      }
    });

    const totalWorkingDays = 30; // static value
    const calculatedPresent = presentDays + paidLeaveDays;
    const calculatedSalary = Math.round(calculatedPresent * perDaySalary);
    const totalAbsent = totalWorkingDays - (presentDays + paidLeaveDays + unpaidLeaveDays);

    res.json({
      employeeId,
      name: employee.name,
      month,
      totalWorkingDays,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      totalAbsent,
      perDaySalary: perDaySalary.toFixed(2),
      totalSalary: salary,
      calculatedSalary,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Updated updateEmployee controller
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    let updates = req.body;

    // Handle file upload if present
    if (req.file) {
      updates.photo = req.file.filename;
    }

    // Convert date if provided
    if (updates.dateOfJoining) {
      updates.dateOfJoining = new Date(updates.dateOfJoining);
    }
   const options = { 
      new: true,
      runValidators: true
    };

  const updated = await Employee.findByIdAndUpdate(id, updates, options);

    if (!updated) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      employee: updated,
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ 
      message: 'Failed to update employee',
      error: err.message 
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Employee deleted successfully'
    });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ 
      message: 'Failed to delete employee',
      error: err.message
    });
  }
};





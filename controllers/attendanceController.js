const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');



exports.addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, reason } = req.body; // ✅ accept reason

    const existing = await Attendance.findOne({ employeeId, date });
    if (existing)
      return res.status(400).json({ message: 'Attendance already marked for this date.' });

    const attendance = await Attendance.create({
      employeeId,
      date,
      status,
      // reason: status === 'Leave' ? reason : '', // ✅ only save reason for leave
      reason: status !== 'Present' ? reason : '',  //reason only for Absent and Leave

    });

    const populated = await attendance.populate('employeeId', 'name email role');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/attendance?employeeId=xxx&date=yyyy-mm-dd&page=1&perPage=10
exports.getAllAttendance = async (req, res) => {
  try {
    const { employeeId, date, page = 1, perPage = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (date) filter.date = new Date(date);

    const totalCount = await Attendance.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);

    const records = await Attendance.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(perPage));

    res.status(200).json({
      status: 'success',
      message: 'Attendance records fetched',
      currentPage: parseInt(page),
      perPage: parseInt(perPage),
      totalPages,
      totalCount,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};



// Get attendance records by employee ID
exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const records = await Attendance.find({ employeeId })
      .populate('employeeId', 'name email role')
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




// Update attendance status
exports.updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Attendance.findByIdAndUpdate(id, { status }, { new: true })
      .populate('employeeId', 'name email role');

    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update attendance status', error: error.message });
  }
};


// exports.markAttendance = async (req, res) => {
//   try {
//       console.log('markAttendance called with:', req.body);
//     const { employeeId } = req.body;
//     if (!employeeId) return res.status(400).json({ message: 'Employee ID is required' });

//     const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

//     const existing = await Attendance.findOne({ employeeId, date: today });
//     if (existing) return res.status(200).json({ message: 'Attendance already marked' });

//     const attendance = new Attendance({
//       employeeId,
//       date: today,
//       // status: 'Present (Pending Validation)',
//       status: 'Present',  // ✅ Safe value

//     });

//     await attendance.save();
//     res.status(201).json({ message: 'Attendance marked successfully', data: attendance });

//   } catch (err) {
//     console.error('Error in markAttendance:', err);
//     res.status(500).json({ message: 'Server error while marking attendance', error: err.message });
//   }

// };

// controllers/attendanceController.js
// exports.checkTodayAttendance = async (req, res) => {
//   try {
//     const userEmail = req.user?.email;
//     if (!userEmail) return res.status(401).json({ message: 'Unauthorized: No email in token' });

//     const employee = await Employee.findOne({ email: userEmail });
//     if (!employee) return res.status(404).json({ message: 'Employee not found' });

//     const today = new Date().toISOString().slice(0, 10);
//     const attendance = await Attendance.findOne({ employeeId: employee._id, date: today });

//     res.status(200).json({ marked: !!attendance });
//   } catch (err) {
//     console.error('Error in checkTodayAttendance:', err);
//     res.status(500).json({ message: 'Error checking today\'s attendance' });
//   }
// };



// controllers/attendanceController.js   with automatic reset login attendance



// exports.markAttendance = async (req, res) => {
//   try {
//     console.log('markAttendance called with:', req.body);
//     const { employeeId } = req.body;
//     if (!employeeId) return res.status(400).json({ message: 'Employee ID is required' });

//     const now = new Date();

//     // Calculate 9:00 PM today
//     const windowStart = new Date(now);
//     if (now.getHours() < 21) {
//       // Before 9 PM, shift window to previous day
//       windowStart.setDate(now.getDate() - 1);
//     }
//     windowStart.setHours(21, 0, 0, 0); // 9:00 PM

//     // Calculate 8:59 PM next day
//     const windowEnd = new Date(windowStart);
//     windowEnd.setDate(windowStart.getDate() + 1);
//     windowEnd.setHours(20, 59, 59, 999); // 8:59:59 PM next day

//     // Check if attendance already marked in this window
//     const existing = await Attendance.findOne({
//       employeeId,
//       createdAt: {
//         $gte: windowStart,
//         $lte: windowEnd
//       }
//     });

//     if (existing) return res.status(200).json({ message: 'Attendance already marked' });

//     const attendance = new Attendance({
//       employeeId,
//       date: now.toISOString().slice(0, 10),  // Optional: store date as YYYY-MM-DD
//       status: 'Present',
//     });

//     await attendance.save();
//     res.status(201).json({ message: 'Attendance marked successfully', data: attendance });

//   } catch (err) {
//     console.error('Error in markAttendance:', err);
//     res.status(500).json({ message: 'Server error while marking attendance', error: err.message });
//   }
// };


exports.markAttendance = async (req, res) => {
  try {
    console.log('markAttendance called with:', req.body);
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Get current time in IST
    const now = new Date();
    const istOffsetMinutes = 330; // IST = UTC+5:30
    const istNow = new Date(now.getTime() + istOffsetMinutes * 60000);

    // Calculate attendance window start (9:00 PM IST)
    const windowStart = new Date(istNow);
    if (istNow.getHours() < 21) {
      // Before 9 PM IST → consider previous day 9:00 PM IST
      windowStart.setDate(windowStart.getDate() - 1);
    }
    windowStart.setHours(21, 0, 0, 0); // Set to 9:00 PM IST

    // Calculate attendance window end (next day 8:59:59 PM IST)
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 1);
    windowEnd.setHours(20, 59, 59, 999); // Set to 8:59:59 PM IST

    // Convert window to UTC for MongoDB comparison
    const utcWindowStart = new Date(windowStart.getTime() - istOffsetMinutes * 60000);
    const utcWindowEnd = new Date(windowEnd.getTime() - istOffsetMinutes * 60000);

    // Check if attendance already exists in this UTC window
    const existing = await Attendance.findOne({
      employeeId,
      createdAt: {
        $gte: utcWindowStart,
        $lte: utcWindowEnd
      }
    });

    if (existing) {
      return res.status(200).json({ message: '✅ Attendance already marked' });
    }

    // Mark new attendance
    const attendance = new Attendance({
      employeeId,
      date: istNow.toISOString().slice(0, 10), // Optional: YYYY-MM-DD in IST
      status: 'Present',
    });

    await attendance.save();
    return res.status(201).json({ message: '✅ Attendance marked successfully', data: attendance });

  } catch (err) {
    console.error('❌ Error in markAttendance:', err);
    return res.status(500).json({ message: 'Server error while marking attendance', error: err.message });
  }
};



exports.checkTodayAttendance = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(401).json({ message: 'Unauthorized: No email in token' });

    const employee = await Employee.findOne({ email: userEmail });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const now = new Date();

    // ⏰ Calculate 9:00 PM today
    const windowStart = new Date(now);
    if (now.getHours() < 21) {
      // Before 9 PM, use previous day 9 PM
      windowStart.setDate(now.getDate() - 1);
    }
    windowStart.setHours(21, 0, 0, 0); // 9:00 PM

    // ⏰ Calculate 8:59:59 PM next day
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 1);
    windowEnd.setHours(20, 59, 59, 999); // 8:59:59 PM next day

    // Check attendance within window
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      createdAt: {
        $gte: windowStart,
        $lte: windowEnd
      }
    });

    res.status(200).json({ marked: !!attendance });
  } catch (err) {
    console.error('Error in checkTodayAttendance:', err);
    res.status(500).json({ message: 'Error checking attendance window' });
  }
};


const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
// Top of your file
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


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
//     console.log('markAttendance called with:', req.body);
//     const { employeeId } = req.body;

//     if (!employeeId) {
//       return res.status(400).json({ message: 'Employee ID is required' });
//     }

//     // Get current time in IST
//     const now = new Date();
//     const istOffsetMinutes = 330; // IST = UTC+5:30
//     const istNow = new Date(now.getTime() + istOffsetMinutes * 60000);

//     // Calculate attendance window start (9:00 PM IST)
//     const windowStart = new Date(istNow);
//     if (istNow.getHours() < 21) {
//       // Before 9 PM IST → consider previous day 9:00 PM IST
//       windowStart.setDate(windowStart.getDate() - 1);
//     }
//     windowStart.setHours(21, 0, 0, 0); // Set to 9:00 PM IST

//     // Calculate attendance window end (next day 8:59:59 PM IST)
//     const windowEnd = new Date(windowStart);
//     windowEnd.setDate(windowEnd.getDate() + 1);
//     windowEnd.setHours(20, 59, 59, 999); // Set to 8:59:59 PM IST

//     // Convert window to UTC for MongoDB comparison
//     const utcWindowStart = new Date(windowStart.getTime() - istOffsetMinutes * 60000);
//     const utcWindowEnd = new Date(windowEnd.getTime() - istOffsetMinutes * 60000);

//     // Check if attendance already exists in this UTC window
//     const existing = await Attendance.findOne({
//       employeeId,
//       createdAt: {
//         $gte: utcWindowStart,
//         $lte: utcWindowEnd
//       }
//     });

//     if (existing) {
//       return res.status(200).json({ message: '✅ Attendance already marked' });
//     }

//     // Mark new attendance
//     const attendance = new Attendance({
//       employeeId,
//       date: istNow.toISOString().slice(0, 10), // Optional: YYYY-MM-DD in IST
//       status: 'Present',
//     });

//     await attendance.save();
//     return res.status(201).json({ message: '✅ Attendance marked successfully', data: attendance });

//   } catch (err) {
//     console.error('❌ Error in markAttendance:', err);
//     return res.status(500).json({ message: 'Server error while marking attendance', error: err.message });
//   }
// };


exports.markAttendance = async (req, res) => {
  try {
    console.log('markAttendance called with:', req.body);
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Current IST time using dayjs
    const istNow = dayjs().tz('Asia/Kolkata');

    // Attendance window start: 9:00 PM IST of the previous or same day
    let windowStart = istNow.hour() < 21
      ? istNow.subtract(1, 'day').set('hour', 21).set('minute', 0).set('second', 0).set('millisecond', 0)
      : istNow.set('hour', 21).set('minute', 0).set('second', 0).set('millisecond', 0);

    // Attendance window end: next day 8:59:59 PM IST
    let windowEnd = windowStart.add(23, 'hour').add(59, 'minute').add(59, 'second').add(999, 'millisecond');

    // Convert to UTC for MongoDB query
    const utcWindowStart = windowStart.utc().toDate();
    const utcWindowEnd = windowEnd.utc().toDate();

    // Check if attendance is already marked within the window
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
      date: istNow.format('YYYY-MM-DD'), // ✅ IST date only
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

    // const now = new Date();

    // // ⏰ Calculate 9:00 PM today
    // const windowStart = new Date(now);
    // if (now.getHours() < 21) {
    //   // Before 9 PM, use previous day 9 PM
    //   windowStart.setDate(now.getDate() - 1);
    // }
    // windowStart.setHours(21, 0, 0, 0); // 9:00 PM

    // // ⏰ Calculate 8:59:59 PM next day
    // const windowEnd = new Date(windowStart);
    // windowEnd.setDate(windowStart.getDate() + 1);
    // windowEnd.setHours(20, 59, 59, 999); // 8:59:59 PM next day

    // // Check attendance within window
    // const attendance = await Attendance.findOne({
    //   employeeId: employee._id,
    //   createdAt: {
    //     $gte: windowStart,
    //     $lte: windowEnd
    //   }
    // });



    const now = new Date();

    // Convert current UTC time to IST
    const istOffset = 5.5 * 60 * 60000; // 5.5 hours in ms
    const istNow = new Date(now.getTime() + istOffset);

    // ⏰ Calculate 9:00 PM IST of today (or previous day if current time is before 9 PM IST)
    const windowStartIST = new Date(istNow);
    if (istNow.getHours() < 21) {
      windowStartIST.setDate(istNow.getDate() - 1);
    }
    windowStartIST.setHours(21, 0, 0, 0); // 9:00 PM IST

    // ⏰ Calculate 8:59:59 PM IST of next day
    const windowEndIST = new Date(windowStartIST);
    windowEndIST.setDate(windowStartIST.getDate() + 1);
    windowEndIST.setHours(20, 59, 59, 999); // 8:59:59 PM IST

    // Now convert windowStartIST and windowEndIST back to UTC for MongoDB query
    const windowStartUTC = new Date(windowStartIST.getTime() - istOffset);
    const windowEndUTC = new Date(windowEndIST.getTime() - istOffset);

    // Check attendance in UTC range
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      createdAt: {
        $gte: windowStartUTC,
        $lte: windowEndUTC
      }
    });

    res.status(200).json({ marked: !!attendance });
    console.log("IST now:", istNow.toISOString());
    console.log("Window Start (UTC):", windowStartUTC.toISOString());
    console.log("Window End (UTC):", windowEndUTC.toISOString());

  } catch (err) {
    console.error('Error in checkTodayAttendance:', err);
    res.status(500).json({ message: 'Error checking attendance window' });
  }
};


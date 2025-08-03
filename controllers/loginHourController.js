
const LoginHour = require('../models/loginHoursSchema');

// 📌 Mark Login
exports.markLogin = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    let record = await LoginHour.findOne({ employeeId, date: today });
    if (!record) {
      record = await LoginHour.create({
        employeeId,
        date: today,
        loginTime: new Date(),
        breaks: []
      });
    }

    res.status(200).json(record);
  } catch (err) {
    console.error('Login tracking error:', err);
    res.status(500).json({ message: 'Failed to mark login' });
  }
};

// 📌 Mark Logout
exports.markLogout = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const record = await LoginHour.findOneAndUpdate(
      { employeeId, date: today },
      { logoutTime: new Date() },
      { new: true }
    );

    if (!record) return res.status(404).json({ message: 'No login record found for today' });

    res.status(200).json(record);
  } catch (err) {
    console.error('Logout tracking error:', err);
    res.status(500).json({ message: 'Failed to mark logout' });
  }
};

// 📌 Start Break
exports.startBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const record = await LoginHour.findOne({ employeeId, date: today });
    if (!record) return res.status(404).json({ message: 'Login record not found for today' });

    if (record.breaks.length >= 3) {
      return res.status(400).json({ message: 'Break limit reached' });
    }

    record.breaks.push({ start: new Date() });
    await record.save();
    res.json(record);
  } catch (err) {
    console.error('Start break error:', err);
    res.status(500).json({ message: 'Failed to start break' });
  }
};

// 📌 End Break
exports.endBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const record = await LoginHour.findOne({ employeeId, date: today });
    if (!record || record.breaks.length === 0) {
      return res.status(400).json({ message: 'No active break found' });
    }

    const lastBreak = record.breaks[record.breaks.length - 1];
    if (lastBreak.end) {
      return res.status(400).json({ message: 'Last break already ended' });
    }

    lastBreak.end = new Date();
    await record.save();
    res.json(record);
  } catch (err) {
    console.error('End break error:', err);
    res.status(500).json({ message: 'Failed to end break' });
  }
};

// 📌 Get Today's Stats (Worked hours + Breaks)
exports.getTodayStats = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const record = await LoginHour.findOne({ employeeId, date: today });

    if (!record) {
      return res.json({ workedHoursToday: 0, totalBreaksToday: 0 });
    }

    const login = new Date(record.loginTime);
    const logout = record.logoutTime ? new Date(record.logoutTime) : new Date();

    let breakDuration = 0;
    if (Array.isArray(record.breaks)) {
      for (const b of record.breaks) {
        if (b.start && b.end) {
          breakDuration += new Date(b.end) - new Date(b.start);
        } else if (b.start && !b.end) {
          breakDuration += new Date() - new Date(b.start);
        }
      }
    }

    const rawWorkedMs = logout - login - breakDuration;
    const workedHoursToday = +(rawWorkedMs / (1000 * 60 * 60)).toFixed(2);
    const totalBreaksToday = record.breaks.length;

    res.json({ workedHoursToday, totalBreaksToday });
  } catch (err) {
    console.error('Error in getTodayStats:', err);
    res.status(500).json({ message: 'Failed to fetch today\'s stats' });
  }
};

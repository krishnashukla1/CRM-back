

const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Signup Controller
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // 1. Check empty fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 3. Password strength validation (min 6 chars, 1 letter & 1 number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 6 characters and contain both letters and numbers'
      });
    }

    // 4. Check if user already exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }



    // 🛑 Check if an admin already exists
    // if (role === 'admin') {
    //   const existingAdmin = await User.findOne({ role: 'admin' });
    //   if (existingAdmin) {
    //     return res.status(403).json({ message: '❌ Admin already registered' });
    //   }
    // }

    // 🛑 Check if more than 2 admins exist
    if (role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount >= 2) {
        return res.status(403).json({ message: '❌ Maximum of 2 admins are allowed' });
      }
    }


    // 5. Hash the password
    const hashed = await bcrypt.hash(password, 10);

    // 6. Create User
    const user = new User({ name, email: normalizedEmail, password: hashed, role });
    await user.save();

    // 7. Create Employee record if normal user
    if (role === 'user') {
      await Employee.create({
        name,
        email,
        role: 'Employee',
        dateOfJoining: new Date(),
        photo: '',
      });
    }

    res.status(201).json({ message: '✅ User registered successfully' });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ✅ Login Controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check empty
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Find user

    const user = await User.findOne({ email: email.toLowerCase() }).lean();// use fresh DB query

    if (!user) return res.status(404).json({ message: 'User not found' });

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // 4. Generate token
    const token = jwt.sign({ userId: user._id, role: user.role, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // 5. Respond
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};


exports.getAdminCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting admins:', err);
    res.status(500).json({ message: 'Server error while counting admins' });
  }
};

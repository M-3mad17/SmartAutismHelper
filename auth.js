const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const router = express.Router();

// ✅ تعريف نموذج المستخدم
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// ✅ تسجيل مستخدم جديد (تشفير كلمة المرور بشكل صحيح)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // تحقق مما إذا كان اسم المستخدم مسجلاً بالفعل
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // 🔴 تشفير كلمة المرور هنا مرة واحدة فقط
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Failed to register user', error: err.message });
  }
});

// ✅ تسجيل الدخول (بدون تشفير جديد)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // 🔴 طباعة القيم لاكتشاف الخطأ
    console.log("Entered password:", password);
    console.log("Stored hashed password:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Comparison result:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // ✅ إنشاء توكن JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ message: 'Failed to login', error: err.message });
  }
});

module.exports = router;
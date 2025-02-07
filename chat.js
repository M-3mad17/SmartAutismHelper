// chat.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// استيراد نموذج الرسالة من server.js
const Message = mongoose.model('Message');

// Route لطلب الرسائل
router.get('/messages', async (req, res) => {
  const { sender, receiver } = req.query;

  try {
    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

module.exports = router;
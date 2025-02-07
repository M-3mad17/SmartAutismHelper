require('dotenv').config(); // تحميل المتغيرات البيئية
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// التحقق من أن MONGODB_URI محمل بشكل صحيح
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file.');
  process.exit(1); // إيقاف التطبيق إذا كان المتغير غير محمل
}

console.log('MONGODB_URI:', process.env.MONGODB_URI);

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Failed to connect to MongoDB Atlas', err));

// تعريف نموذج الرسالة
const messageSchema = new mongoose.Schema({
  sender: String, // الدكتور أو الأهل
  receiver: String, // الدكتور أو الأهل
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Autism Chat Server!');
});

// استيراد Routes
const authRoutes = require('./auth');
const chatRoutes = require('./chat');

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// إنشاء WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('User connected');

  // استقبال رسالة جديدة من العميل
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.event === 'send-message') {
      const { sender, receiver, message } = data.data;
      const newMessage = new Message({ sender, receiver, message });
      newMessage.save()
        .then(() => {
          // إرسال الرسالة للجميع
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                event: 'new-message',
                data: newMessage,
              }));
            }
          });
        })
        .catch(err => console.error('Failed to save message:', err));
    }

    if (data.event === 'request-messages') {
      const { sender, receiver } = data.data;
      Message.find({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      })
        .sort({ timestamp: 1 })
        .then((messages) => {
          // إرسال الرسائل للعميل
          ws.send(JSON.stringify({
            event: 'load-messages',
            data: messages,
          }));
        })
        .catch((err) => console.error('Failed to fetch messages:', err));
    }
  });

  ws.on('close', () => {
    console.log('User disconnected');
  });
});

// بدء الخادم
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
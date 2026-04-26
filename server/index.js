const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = new Map();
const chats = new Map();
const messages = new Map();

chats.set('general', {
  id: 'general',
  name: 'General',
  type: 'group',
  members: [],
  createdAt: Date.now()
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, chats: chats.size });
});

app.get('/api/chats', (req, res) => {
  res.json(Array.from(chats.values()));
});

app.post('/api/chats', (req, res) => {
  const { name, type = 'group' } = req.body;
  const chat = {
    id: uuidv4(),
    name,
    type,
    members: [],
    createdAt: Date.now()
  };
  chats.set(chat.id, chat);
  res.json(chat);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userData) => {
    users.set(socket.id, {
      ...userData,
      socketId: socket.id,
      online: true
    });
    io.emit('users update', Array.from(users.values()));
  });

  socket.on('join chat', (chatId) => {
    socket.join(chatId);
    const chat = chats.get(chatId);
    if (chat) {
      const chatMessages = messages.get(chatId) || [];
      socket.emit('chat history', { chatId, messages: chatMessages });
    }
  });

  socket.on('send message', (data) => {
    const { chatId, text, sender } = data;
    const message = {
      id: uuidv4(),
      chatId,
      text,
      sender,
      timestamp: Date.now()
    };

    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(message);

    io.to(chatId).emit('new message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user typing', data);
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    io.emit('users update', Array.from(users.values()));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
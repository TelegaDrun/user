const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATIC_DIR = path.join(__dirname, '..');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Helper functions
function loadJson(filename, defaultVal = {}) {
  try {
    const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(data);
  } catch { return defaultVal; }
}

function saveJson(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

function loadGroups() { return loadJson('groups.json', {}); }
function saveGroups(data) { saveJson('groups.json', data); }

function isFriends(user1, user2) {
  const friends = loadJson('friends.json', {});
  return (friends[user1] || []).includes(user2);
}

// API Routes

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, error: 'Missing username or password' });
  
  const passwords = loadJson('passwords.json', {});
  if (passwords[username]) return res.json({ ok: false, error: 'Username already exists' });
  
  passwords[username] = password;
  saveJson('passwords.json', passwords);
  
  const users = loadJson('users.json', {});
  users[username] = { online: true, created: Date.now(), displayName: username };
  saveJson('users.json', users);
  
  const friends = loadJson('friends.json', {});
  if (!friends[username]) friends[username] = [];
  saveJson('friends.json', friends);
  
  res.json({ ok: true, username });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.json({ ok: false, error: 'Введи никнейм' });
  if (!password) return res.json({ ok: false, error: 'Введи пароль' });
  
  const passwords = loadJson('passwords.json', {});
  if (!passwords[username] || passwords[username] !== password) {
    return res.json({ ok: false, error: 'Неверный никнейм или пароль' });
  }
  
  const users = loadJson('users.json', {});
  users[username] = { ...users[username], online: true, created: users[username]?.created || Date.now(), displayName: username };
  saveJson('users.json', users);
  
  const friends = loadJson('friends.json', {});
  if (!friends[username]) friends[username] = [];
  saveJson('friends.json', friends);
  
  res.json({ ok: true, username });
});

// Settings
app.post('/api/settings', (req, res) => {
  const { username, settings } = req.body;
  const users = loadJson('users.json', {});
  if (users[username]) {
    Object.assign(users[username], {
      theme: settings.theme || '',
      avatar: settings.avatar || '',
      sound: settings.sound !== false,
      vibrate: settings.vibrate !== false,
      soundType: settings.soundType || 'default',
      customSound: settings.customSound || ''
    });
    saveJson('users.json', users);
  }
  res.json({ ok: true, settings: users[username] || {} });
});

// Users search
app.get('/api/users', (req, res) => {
  const { q = '', user: currentUser } = req.query;
  const users = loadJson('users.json', {});
  const friends = loadJson('friends.json', {});
  const userFriends = friends[currentUser] || [];
  
  const allUsers = Object.keys(users).filter(u => 
    u !== currentUser && !userFriends.includes(u) &&
    (!q || u.includes(q.toLowerCase()) || (users[u].displayName || '').toLowerCase().includes(q.toLowerCase()))
  ).map(u => ({
    username: u,
    online: users[u].online || false,
    displayName: users[u].displayName || u,
    avatar: users[u].avatar || ''
  }));
  
  res.json({ users: allUsers });
});

// User info
app.get('/api/user', (req, res) => {
  const { username } = req.query;
  const users = loadJson('users.json', {});
  const userData = users[username] || {};
  res.json({
    username,
    displayName: userData.displayName || username,
    online: userData.online || false,
    avatar: userData.avatar || ''
  });
});

// Friends list
app.get('/api/friends', (req, res) => {
  const { user } = req.query;
  const users = loadJson('users.json', {});
  const friends = loadJson('friends.json', {});
  
  const friendList = (friends[user] || []).map(f => ({
    username: f,
    online: users[f]?.online || false,
    displayName: users[f]?.displayName || f,
    avatar: users[f]?.avatar || ''
  }));
  
  res.json({ friends: friendList });
});

// Friend requests
app.get('/api/friend/requests', (req, res) => {
  const { user } = req.query;
  const requests = loadJson('friend_requests.json', {});
  res.json({ requests: requests[user] || [] });
});

// Send message
app.post('/api/send', (req, res) => {
  const { sender, recipient, text, type, data: mediaData } = req.body;
  if (!sender || !recipient) return res.json({ ok: false, error: 'Missing sender or recipient' });
  if (!isFriends(sender, recipient)) return res.json({ ok: false, error: 'Not friends' });
  
  const messages = loadJson('messages.json', {});
  const key = [sender, recipient].sort().join('|||');
  if (!messages[key]) messages[key] = [];
  
  const msgData = { id: uuidv4(), sender, timestamp: Date.now() / 1000 };
  if (text) msgData.text = text;
  if (type === 'photo' || type === 'video' || type === 'circle') {
    msgData.type = type;
    msgData.data = mediaData;
  }
  
  messages[key].push(msgData);
  saveJson('messages.json', messages);
  res.json({ ok: true });
});

// Messages
app.get('/api/messages', (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) return res.json({ messages: [] });
  if (!isFriends(user1, user2)) return res.json({ error: 'Not friends', messages: [] });
  
  const messages = loadJson('messages.json', {});
  const key = [user1, user2].sort().join('|||');
  let msgs = messages[key] || [];
  
  if (user1 !== user2) {
    msgs = msgs.filter(m => !m.deleted_for_sender || m.sender !== user1);
  }
  
  res.json({ messages: msgs });
});

// Delete message
app.post('/api/message/delete', (req, res) => {
  const { user1, user2, idx, where } = req.body;
  if (!user1 || !user2 || idx === undefined) return res.json({ ok: false });
  
  const messages = loadJson('messages.json', {});
  const key = [user1, user2].sort().join('|||');
  
  if (messages[key] && idx >= 0 && idx < messages[key].length) {
    if (where === 'both') messages[key].splice(idx, 1);
    else messages[key][idx].deleted_for_sender = true;
    saveJson('messages.json', messages);
  }
  
  res.json({ ok: true });
});

// Groups
app.get('/api/group/list', (req, res) => {
  const { user } = req.query;
  const groups = loadGroups();
  const userGroups = Object.entries(groups)
    .filter(([_, g]) => g.members?.includes(user))
    .map(([name, g]) => ({ name, members: g.members || [], avatar: g.avatar || '' }));
  res.json({ groups: userGroups });
});

app.post('/api/group', (req, res) => {
  const { name, members } = req.body;
  if (!name || !members || members.length < 2) return res.json({ ok: false, error: 'Invalid group' });
  
  const groups = loadGroups();
  groups[name] = { members, created: Date.now(), avatar: groups[name]?.avatar || '' };
  saveGroups(groups);
  res.json({ ok: true });
});

app.post('/api/group/send', (req, res) => {
  const { group, sender, text } = req.body;
  if (!group || !sender || !text) return res.json({ ok: false });
  
  const groups = loadGroups();
  if (!groups[group]?.members?.includes(sender)) return res.json({ ok: false, error: 'Not in group' });
  
  const messages = loadJson('group_messages.json', {});
  if (!messages[group]) messages[group] = [];
  messages[group].push({ id: uuidv4(), sender, text, timestamp: Date.now() / 1000 });
  saveJson('group_messages.json', messages);
  res.json({ ok: true });
});

app.get('/api/group/messages', (req, res) => {
  const { group } = req.query;
  const messages = loadJson('group_messages.json', {});
  res.json({ messages: messages[group] || [] });
});

app.get('/api/group/info', (req, res) => {
  const { name } = req.query;
  const groups = loadGroups();
  const g = groups[name] || {};
  res.json({ name, members: g.members || [], avatar: g.avatar || '' });
});

app.post('/api/group/settings', (req, res) => {
  const { name, action, user, member, avatar } = req.body;
  const groups = loadGroups();
  if (!groups[name]) return res.json({ ok: false, error: 'Group not found' });
  
  const users = loadJson('users.json', {});
  const g = groups[name];
  
  if (action === 'add_member') {
    if (member && users[member] && !g.members?.includes(member)) {
      g.members = g.members || [];
      g.members.push(member);
    } else if (member && !users[member]) {
      return res.json({ ok: false, error: 'Пользователь не найден' });
    }
  } else if (action === 'remove_member' && member) {
    g.members = g.members?.filter(m => m !== member) || [];
  } else if (action === 'leave' && user) {
    g.members = g.members?.filter(m => m !== user) || [];
  } else if (action === 'delete' && user) {
    delete groups[name];
  } else if (action === 'avatar' && avatar) {
    g.avatar = avatar;
  }
  
  saveGroups(groups);
  res.json({ ok: true, group: groups[name] || {} });
});

// Friends
app.post('/api/friend/add', (req, res) => {
  const { from: fromUser, to: toUser } = req.body;
  if (!fromUser || !toUser) return res.json({ ok: false, error: 'Missing user' });
  
  const requests = loadJson('friend_requests.json', {});
  if (!requests[toUser]) requests[toUser] = [];
  if (!requests[toUser].includes(fromUser)) requests[toUser].push(fromUser);
  saveJson('friend_requests.json', requests);
  res.json({ ok: true });
});

app.post('/api/friend/accept', (req, res) => {
  const { user, from: fromUser } = req.body;
  if (!user || !fromUser) return res.json({ ok: false, error: 'Missing user' });
  
  const friends = loadJson('friends.json', {});
  if (!friends[user]) friends[user] = [];
  if (!friends[user].includes(fromUser)) friends[user].push(fromUser);
  if (!friends[fromUser]) friends[fromUser] = [];
  if (!friends[fromUser].includes(user)) friends[fromUser].push(user);
  saveJson('friends.json', friends);
  
  const requests = loadJson('friend_requests.json', {});
  if (requests[user]) requests[user] = requests[user].filter(r => r !== fromUser);
  saveJson('friend_requests.json', requests);
  
  res.json({ ok: true });
});

app.post('/api/friend/decline', (req, res) => {
  const { user, from: fromUser } = req.body;
  const requests = loadJson('friend_requests.json', {});
  if (requests[user]) requests[user] = requests[user].filter(r => r !== fromUser);
  saveJson('friend_requests.json', requests);
  res.json({ ok: true });
});

app.post('/api/friend/remove', (req, res) => {
  const { user, friend } = req.body;
  const friends = loadJson('friends.json', {});
  if (friends[user]) friends[user] = friends[user].filter(f => f !== friend);
  if (friends[friend]) friends[friend] = friends[friend].filter(f => f !== user);
  saveJson('friends.json', friends);
  res.json({ ok: true });
});

// Catch-all for static files
app.get('*', (req, res) => {
  const filePath = path.join(STATIC_DIR, req.path === '/' ? 'index.html' : req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Telega server: ${PORT}`);
});
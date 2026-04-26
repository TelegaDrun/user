import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chats, setChats] = useState([
    { id: 'general', name: 'General', type: 'group' }
  ]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('users update', (users) => setUsers(users));
    socket.on('chat history', ({ chatId, messages }) => {
      setMessages(prev => ({ ...prev, [chatId]: messages }));
    });
    socket.on('new message', (message) => {
      setMessages(prev => ({
        ...prev,
        [message.chatId]: [...(prev[message.chatId] || []), message]
      }));
    });

    return () => {
      socket.off('users update');
      socket.off('chat history');
      socket.off('new message');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('register', { name: username });
      setIsLoggedIn(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && activeChat) {
      socket.emit('send message', {
        chatId: activeChat.id,
        text: newMessage,
        sender: username
      });
      setNewMessage('');
    }
  };

  const joinChat = (chat) => {
    setActiveChat(chat);
    socket.emit('join chat', chat.id);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <h1>Telega</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Ваше имя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <input type="text" className="search-input" placeholder="Поиск" />
        </div>
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => joinChat(chat)}
            >
              <div className="chat-avatar">
                {chat.name[0].toUpperCase()}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-preview">
                  {messages[chat.id]?.length > 0 
                    ? messages[chat.id][messages[chat.id].length - 1].text.substring(0, 30)
                    : 'Нет сообщений'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="main-chat">
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-title">{activeChat.name}</div>
            </div>
            <div className="messages-container">
              {messages[activeChat.id]?.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`message ${msg.sender === username ? 'sent' : 'received'}`}
                >
                  <div className="message-bubble">
                    <div>{msg.text}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input-container" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                placeholder="Сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="send-btn">➤</button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">Выберите чат</div>
        )}
      </div>
    </div>
  );
}

export default App;
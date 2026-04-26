from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import time
import uuid

PORT = 8080
USERS_FILE = 'data/users.json'
PASS_FILE = 'data/passwords.json'
MSG_FILE = 'data/messages.json'

def load_users():
    try:
        with open(USERS_FILE) as f:
            return json.load(f)
    except: return {}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def load_passwords():
    try:
        with open(PASS_FILE) as f:
            return json.load(f)
    except: return {}

def save_passwords(passwords):
    with open(PASS_FILE, 'w') as f:
        json.dump(passwords, f, indent=2)

def load_messages():
    try:
        with open(MSG_FILE) as f:
            return json.load(f)
    except: return {}

def save_messages(msgs):
    with open(MSG_FILE, 'w') as f:
        json.dump(msgs, f, indent=2)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        
        if self.path == '/api/search' or self.path.startswith('/api/search?'):
            users = load_users()
            user_list = [{'username': u, 'online': users.get(u, {}).get('online', False), 'displayName': users.get(u, {}).get('displayName', u)} for u in users]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'users': user_list}).encode())
            return
        
        if self.path.startswith('/api/messages?'):
            params = parse_qs(urlparse(self.path).query)
            user1 = params.get('user1', [''])[0].lower()
            user2 = params.get('user2', [''])[0].lower()
            messages = load_messages()
            key = '|||'.join(sorted([user1, user2]))
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'messages': messages.get(key, [])})).encode())
            return
        
        path = '/index.html' if self.path == '/' else self.path
        try:
            with open(path.lstrip('/'), 'rb') as f:
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(f.read())
        except:
            self.send_error(404)
    
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length).decode()) if length > 0 else {}
        
        if self.path == '/api/register':
            username = data.get('username', '').strip().lower()
            password = data.get('password', '').strip()
            
            if not username or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Введи никнейм и пароль'}).encode())
                return
            
            passwords = load_passwords()
            
            if username in passwords:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': '用户 уже существует'}).encode())
                return
            
            passwords[username] = password
            save_passwords(passwords)
            
            users = load_users()
            users[username] = {'online': True, 'created': time.time(), 'displayName': username}
            save_users(users)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'username': username}).encode())
            return
        
        if self.path == '/api/login':
            username = data.get('username', '').strip().lower()
            password = data.get('password', '').strip()
            
            if not username or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Введи никнейм и пароль'}).encode())
                return
            
            passwords = load_passwords()
            
            if username not in passwords:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': '用户 не найден. Зарегистрируйся.'}).encode())
                return
            
            if passwords[username] != password:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Неверный пароль'}).encode())
                return
            
            users = load_users()
            if username in users:
                users[username]['online'] = True
            else:
                users[username] = {'online': True, 'created': time.time(), 'displayName': username}
            save_users(users)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'username': username}).encode())
            return
        
        if self.path == '/api/send':
            sender = data.get('sender', '').lower()
            recipient = data.get('recipient', '').lower()
            text = data.get('text', '')
            
            if not sender or not recipient or not text:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Ошибка'}).encode())
                return
            
            messages = load_messages()
            key = '|||'.join(sorted([sender, recipient]))
            if key not in messages:
                messages[key] = []
            messages[key].append({
                'id': str(uuid.uuid4()),
                'sender': sender,
                'text': text,
                'timestamp': time.time()
            })
            save_messages(messages)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if self.path == '/api/messages':
            user1 = data.get('user1', '').lower()
            user2 = data.get('user2', '').lower()
            
            messages = load_messages()
            key = '|||'.join(sorted([user1, user2]))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'messages': messages.get(key, [])})).encode())
            return
        
        self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

os.chdir('C:/games/telega-clone')
print(f'Server on {PORT}')
import sys
sys.stdout.flush()
sys.stderr.flush()

import socketserver
socketserver.TCPServer.allow_reuse_address = True
server = HTTPServer(('0.0.0.0', PORT), Handler)
server.serve_forever()
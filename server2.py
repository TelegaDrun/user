import sys
import os
import json
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8080
DB_FILE = 'D:/telega-clone/data/users.json'
MSG_FILE = 'D:/telega-clone/data/messages.json'

def load_db():
    global users, messages
    try:
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                data = json.load(f)
                print('LOADED:', data.keys() if data else 'EMPTY')
                if isinstance(data, dict):
                    users = data
                else:
                    users = {}
    except Exception as e:
        print('ERROR:', e)
        users = {}
    
    try:
        if os.path.exists(MSG_FILE):
            with open(MSG_FILE, 'r') as f:
                messages = json.load(f)
    except:
        messages = {}

def save_users():
    with open(DB_FILE, 'w') as f:
        json.dump(users, f, indent=2)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        
        if self.path.startswith('/api/search'):
            load_db()
            user_list = []
            for u in users:
                u_data = users.get(u, {})
                user_list.append({'username': u, 'online': u_data.get('online', False), 'displayName': u_data.get('displayName', u)})
            self.wfile.write(json.dumps({'users': user_list}).encode())
            return
        
        path = '/index.html' if self.path == '/' else self.path
        try:
            with open('D:/telega-clone' + path, 'rb') as f:
                self.send_response(200)
                ctype = 'text/html'
                if path.endswith('.css'): ctype = 'text/css'
                self.send_header('Content-Type', ctype)
                self.end_headers()
                self.wfile.write(f.read())
        except:
            self.send_error(404)
    
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length).decode()) if length > 0 else {}
        
        if self.path == '/api/login':
            username = (data.get('username', '') or '').lower().strip()
            display_name = data.get('displayName', '')
            if username:
                load_db()
                if username not in users:
                    users[username] = {'online': True, 'created': time.time(), 'last_seen': time.time(), 'displayName': display_name}
                else:
                    users[username]['online'] = True
                    users[username]['last_seen'] = time.time()
                save_users()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'username': username}).encode())
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())

    def log_message(self, s, *a): pass

load_db()
print(f'Telega: http://0.0.0.0:{PORT}')
HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
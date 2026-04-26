from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import uuid

PORT = 8080
DATA_FILE = 'D:/telega-clone/data/messages.json'
USERS_FILE = 'D:/telega-clone/data/users.json'

try:
    with open(DATA_FILE, 'r') as f:
        messages = json.load(f)
except: messages = {}

try:
    with open(USERS_FILE, 'r') as f:
        users = json.load(f)
except: users = {}

class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if self.path == '/api/users' or self.path.startswith('/api/users?'):
                self.wfile.write(json.dumps({'users': [], 'groups': []}).encode())
            elif self.path == '/api/messages' or self.path.startswith('/api/messages?'):
                self.wfile.write(json.dumps({'messages': []}).encode())
            else:
                self.wfile.write(json.dumps({'ok': True}).encode())
            return
        path = '/index.html' if self.path == '/' else self.path
        filepath = 'D:/telega-clone' + path
        if os.path.exists(filepath):
            self.send_response(200)
            ctype = 'text/html'
            if path.endswith('.css'): ctype = 'text/css'
            elif path.endswith('.js'): ctype = 'application/javascript'
            self.send_header('Content-Type', ctype)
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length).decode()) if length > 0 else {}
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'ok': True}).encode())

print(f'http://127.0.0.1:{PORT}')
HTTPServer(('', PORT), Handler).serve_forever()
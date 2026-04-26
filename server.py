import http.server
import socketserver
import json
import os
import time
import uuid

PORT = 8080
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def load_json(filename, default=dict):
    try:
        with open(os.path.join(DATA_DIR, filename)) as f:
            return json.load(f)
    except:
        return default()

def save_json(filename, data):
    with open(os.path.join(DATA_DIR, filename), 'w') as f:
        json.dump(data, f, indent=2)

def load_groups():
    return load_json('groups.json', dict)

def save_groups(data):
    save_json('groups.json', data)

def is_friends(user1, user2):
    friends = load_json('friends.json')
    user_friends = friends.get(user1, [])
    return user2 in user_friends

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def handle(self):
        try:
            super().handle()
        except Exception as e:
            print(f"Error: {e}")
    
    def do_OPTIONS(self):
        try:
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
        except Exception as e:
            print(f"OPTIONS error: {e}")
    def do_GET(self):
        path = self.path.split('?')[0]
        from urllib.parse import parse_qs
        params = parse_qs(self.path.split('?')[1] if '?' in self.path else '')

        if path == '/api/users':
            query = params.get('q', [''])[0].lower()
            current_user = params.get('user', [''])[0].lower()
            users = load_json('users.json')
            friends = load_json('friends.json')
            user_friends = friends.get(current_user, [])
            all_users = []
            for u in users:
                if u != current_user and u not in user_friends:
                    if not query or query in u or query in users.get(u, {}).get('displayName', '').lower():
                        all_users.append({'username': u, 'online': users.get(u, {}).get('online', False), 'displayName': users.get(u, {}).get('displayName', u), 'avatar': users.get(u, {}).get('avatar', '')})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'users': all_users}).encode())
            return

        if path == '/api/user':
            target = params.get('username', [''])[0].lower()
            users = load_json('users.json')
            user_data = users.get(target, {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'username': target, 'displayName': user_data.get('displayName', target), 'online': user_data.get('online', False), 'avatar': user_data.get('avatar', '')}).encode())
            return

        if path.startswith('/u/'):
            target_user = path[3:].lower()
            users = load_json('users.json')
            user_data = users.get(target_user, {})
            display_name = user_data.get('displayName', target_user)
            avatar = user_data.get('avatar', '')
            online = user_data.get('online', False)
            avatar_html = f'<img src="{avatar}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;">' if avatar else f'<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#2481cc,#1a6dbb);display:flex;align-items:center;justify-content:center;color:white;font-size:48px;font-weight:700;">{display_name[0].upper()}</div>'
            html = f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>@{target_user} - TelegaDrun</title>
  <style>
    body {{ font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px; }}
    .profile {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
    .avatar {{ margin-bottom: 20px; }}
    .name {{ font-size: 28px; font-weight: 700; margin-bottom: 5px; }}
    .username {{ font-size: 16px; color: #999; margin-bottom: 15px; }}
    .status {{ display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }}
    .online {{ background: #d4f8d4; color: #2e7d32; }}
    .offline {{ background: #f5f5f5; color: #999; }}
    .back {{ display: inline-block; margin-top: 30px; padding: 12px 24px; background: #2481cc; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; }}
  </style>
</head>
<body>
  <div class="profile">
    <div class="avatar">{avatar_html}</div>
    <div class="name">{display_name}</div>
    <div class="username">@{target_user}</div>
    <div class="status {'online' if online else 'offline'}">{'Онлайн' if online else 'Не в сети'}</div>
    <a href="/" class="back">На главную</a>
  </div>
</body>
</html>'''
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
            return

        if path == '/api/user':
            target_user = params.get('username', [''])[0].lower()
            users = load_json('users.json')
            user_data = users.get(target_user, {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'username': target_user, 'displayName': user_data.get('displayName', target_user), 'online': user_data.get('online', False), 'avatar': user_data.get('avatar', '')}).encode())
            return

        if path == '/api/search':
            users = load_json('users.json')
            current_user = params.get('user', [''])[0].lower()
            user_list = []
            for u in users:
                if u != current_user and is_friends(current_user, u):
                    user_list.append({'username': u, 'online': users.get(u, {}).get('online', False), 'displayName': users.get(u, {}).get('displayName', u)})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'users': user_list}).encode())
            return
        
        if path == '/api/friends':
            username = params.get('user', [''])[0].lower()
            users = load_json('users.json')
            friends = load_json('friends.json')
            user_friends = friends.get(username, [])
            friend_list = []
            for f in user_friends:
                friend_list.append({'username': f, 'online': users.get(f, {}).get('online', False), 'displayName': users.get(f, {}).get('displayName', f), 'avatar': users.get(f, {}).get('avatar', '')})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'friends': friend_list}).encode())
            return

        if path == '/api/group/list':
            username = params.get('user', [''])[0].lower()
            groups = load_groups()
            user_groups = []
            for gname, gdata in groups.items():
                if username in gdata.get('members', []):
                    user_groups.append({'name': gname, 'members': gdata.get('members', [])})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'groups': user_groups}).encode())
            return

        if path == '/api/group/messages':
            group_name = params.get('group', [''])[0]
            messages = load_json('group_messages.json', dict)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'messages': messages.get(group_name, [])}).encode())
            return
        
        if path == '/api/friend/requests':
            username = params.get('user', [''])[0].lower()
            requests = load_json('friend_requests.json')
            user_requests = requests.get(username, [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'requests': user_requests}).encode())
            return
        
        if path == '/api/messages':
            user1 = params.get('user1', [''])[0].lower()
            user2 = params.get('user2', [''])[0].lower()
            if not user1 or not user2:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'messages': []}).encode())
                return
            
            if not is_friends(user1, user2):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Not friends', 'messages': []}).encode())
                return
            
            messages = load_json('messages.json')
            key = '|||'.join(sorted([user1, user2]))
            msgs = messages.get(key, [])
            filtered = []
            for m in msgs:
                if m.get('deleted_for_sender'):
                    if m.get('sender') != user1:
                        filtered.append(m)
                else:
                    filtered.append(m)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'messages': filtered}).encode())
            return

        if path == '/api/group/info':
            name = params.get('name', [''])[0]
            groups = load_groups()
            g = groups.get(name, {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'name': name, 'members': g.get('members', []), 'avatar': g.get('avatar', '')}).encode())
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
        path = self.path.split('?')[0]
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length).decode()) if length > 0 else {}
        
        if path == '/api/register':
            username = data.get('username', '').strip().lower()
            password = data.get('password', '').strip()
            if not username or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing username or password'}).encode())
                return
            
            passwords = load_json('passwords.json')
            
            if username in passwords:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Username already exists'}).encode())
                return
            
            passwords[username] = password
            save_json('passwords.json', passwords)
            
            users = load_json('users.json')
            users[username] = {'online': True, 'created': time.time(), 'displayName': username}
            save_json('users.json', users)
            
            friends = load_json('friends.json')
            if username not in friends:
                friends[username] = []
            save_json('friends.json', friends)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'username': username}).encode())
            return
        
        if path == '/api/login':
            username = data.get('username', '').strip().lower()
            password = data.get('password', '').strip()
            if not username:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Введи никнейм'}).encode())
                return
            
            if not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Введи пароль'}).encode())
                return
            
            passwords = load_json('passwords.json')
            if username not in passwords or passwords[username] != password:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Неверный никнейм или пароль'}).encode())
                return
            
            users = load_json('users.json')
            if username in users:
                users[username]['online'] = True
            else:
                users[username] = {'online': True, 'created': time.time(), 'displayName': username}
            save_json('users.json', users)
            
            friends = load_json('friends.json')
            if username not in friends:
                friends[username] = []
            save_json('friends.json', friends)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'username': username}).encode())
            return
        
        if path == '/api/settings':
            username = data.get('username', '').lower()
            settings = data.get('settings', {})
            users = load_json('users.json')
            if username in users:
                users[username]['theme'] = settings.get('theme', '')
                users[username]['avatar'] = settings.get('avatar', '')
                users[username]['sound'] = settings.get('sound', True)
                users[username]['vibrate'] = settings.get('vibrate', True)
                users[username]['soundType'] = settings.get('soundType', 'default')
                users[username]['customSound'] = settings.get('customSound', '')
                save_json('users.json', users)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'settings': users.get(username, {})}).encode())
            return
        
        if path == '/api/send':
            sender = data.get('sender', '').lower()
            recipient = data.get('recipient', '').lower()
            text = data.get('text', '')
            msg_type = data.get('type', 'text')
            media_data = data.get('data', '')
            
            if not sender or not recipient:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing sender or recipient'}).encode())
                return
            
            if not is_friends(sender, recipient):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Not friends'}).encode())
                return
            
            messages = load_json('messages.json')
            key = '|||'.join(sorted([sender, recipient]))
            if key not in messages:
                messages[key] = []
            msg_data = {'id': str(uuid.uuid4()), 'sender': sender, 'timestamp': time.time()}
            if text:
                msg_data['text'] = text
            if msg_type in ('photo', 'video', 'circle'):
                msg_data['type'] = msg_type
                msg_data['data'] = media_data
            messages[key].append(msg_data)
            save_json('messages.json', messages)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return

        if path == '/api/message/delete':
            user1 = data.get('user1', '').lower()
            user2 = data.get('user2', '').lower()
            idx = data.get('idx')
            where = data.get('where', 'me')
            
            if not user1 or not user2 or idx is None:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False}).encode())
                return
            
            messages = load_json('messages.json')
            key = '|||'.join(sorted([user1, user2]))
            if key in messages and 0 <= idx < len(messages[key]):
                msg = messages[key][idx]
                if where == 'both':
                    messages[key].pop(idx)
                else:
                    msg['deleted_for_sender'] = True
                save_json('messages.json', messages)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return

        if path == '/api/group':
            name = data.get('name', '').strip()
            members = data.get('members', [])
            if not name or len(members) < 2:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Invalid group'}).encode())
                return
            
            groups = load_groups()
            groups[name] = {'members': members, 'created': time.time(), 'avatar': groups.get(name, {}).get('avatar', '')}
            save_groups(groups)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return

        if path == '/api/group/settings':
            name = data.get('name', '').strip()
            action = data.get('action', '')
            user = data.get('user', '').lower()
            new_member = data.get('member', '').lower()
            avatar = data.get('avatar', None)
            
            groups = load_groups()
            if name not in groups:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Group not found'}).encode())
                return
            
            g = groups[name]
            
            if action == 'add_member':
                if new_member and new_member in users and new_member not in g.get('members', []):
                    g.setdefault('members', []).append(new_member)
                elif new_member and new_member not in users:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'ok': False, 'error': 'Пользователь не найден'}).encode())
                    return
            elif action == 'remove_member':
                if new_member and new_member in g.get('members', []):
                    g['members'].remove(new_member)
            elif action == 'leave':
                if user and user in g.get('members', []):
                    g['members'].remove(user)
            elif action == 'delete':
                if user in g.get('members', []):
                    del groups[name]
            elif action == 'avatar' and avatar is not None:
                g['avatar'] = avatar
            
            save_groups(groups)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'group': groups.get(name, {})}).encode())
            return

        if path == '/api/group/info':
            name = params.get('name', [''])[0]
            groups = load_groups()
            g = groups.get(name, {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'name': name, 'members': g.get('members', []), 'avatar': g.get('avatar', '')}).encode())
            return

        if path == '/api/group/send':
            group = data.get('group', '').strip()
            sender = data.get('sender', '').lower()
            text = data.get('text', '')
            
            if not group or not sender or not text:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False}).encode())
                return
            
            groups = load_groups()
            if group not in groups or sender not in groups[group].get('members', []):
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Not in group'}).encode())
                return
            
            messages = load_json('group_messages.json', dict)
            if group not in messages:
                messages[group] = []
            messages[group].append({'id': str(uuid.uuid4()), 'sender': sender, 'text': text, 'timestamp': time.time()})
            save_json('group_messages.json', messages)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/friend/add':
            from_user = data.get('from', '').lower()
            to_user = data.get('to', '').lower()
            if not from_user or not to_user:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing user'}).encode())
                return
            
            requests = load_json('friend_requests.json')
            if to_user not in requests:
                requests[to_user] = []
            if from_user not in requests[to_user]:
                requests[to_user].append(from_user)
            save_json('friend_requests.json', requests)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/friend/accept':
            user = data.get('user', '').lower()
            from_user = data.get('from', '').lower()
            if not user or not from_user:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing user'}).encode())
                return
            
            friends = load_json('friends.json')
            if user not in friends:
                friends[user] = []
            if from_user not in friends[user]:
                friends[user].append(from_user)
            if from_user not in friends:
                friends[from_user] = []
            if user not in friends[from_user]:
                friends[from_user].append(user)
            save_json('friends.json', friends)
            
            requests = load_json('friend_requests.json')
            if user in requests and from_user in requests[user]:
                requests[user].remove(from_user)
            save_json('friend_requests.json', requests)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/friend/decline':
            user = data.get('user', '').lower()
            from_user = data.get('from', '').lower()
            requests = load_json('friend_requests.json')
            if user in requests and from_user in requests[user]:
                requests[user].remove(from_user)
            save_json('friend_requests.json', requests)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/friend/remove':
            user = data.get('user', '').lower()
            friend = data.get('friend', '').lower()
            friends = load_json('friends.json')
            if user in friends and friend in friends[user]:
                friends[user].remove(friend)
            if friend in friends and user in friends[friend]:
                friends[friend].remove(user)
            save_json('friends.json', friends)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/changenick':
            old_nick = data.get('oldNick', '').lower()
            new_nick = data.get('newNick', '').lower()
            if not old_nick or not new_nick:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Missing nickname'}).encode())
                return
            
            users = load_json('users.json')
            passwords = load_json('passwords.json')
            friends = load_json('friends.json')
            messages = load_json('messages.json')
            friend_requests = load_json('friend_requests.json')
            
            if new_nick in users or new_nick in passwords:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'Ник уже занят'}).encode())
                return
            
            if old_nick in users:
                users[new_nick] = users.pop(old_nick)
                users[new_nick]['displayName'] = new_nick
            if old_nick in passwords:
                passwords[new_nick] = passwords.pop(old_nick)
            if old_nick in friends:
                friends[new_nick] = friends.pop(old_nick)
            if old_nick in friend_requests:
                friend_requests[new_nick] = friend_requests.pop(old_nick)
            
            new_messages = {}
            for k, v in messages.items():
                parts = k.split('|||')
                if len(parts) == 2:
                    new_key = '|||'.join([new_nick if p == old_nick else p for p in parts])
                    new_messages[new_key] = v
                else:
                    new_messages[k] = v
            
            save_json('users.json', users)
            save_json('passwords.json', passwords)
            save_json('friends.json', friends)
            save_json('friend_requests.json', friend_requests)
            save_json('messages.json', new_messages)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/call':
            call_from = data.get('from', '').lower()
            call_to = data.get('to', '').lower()
            call_type = data.get('type', 'call')
            if not call_from or not call_to:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False}).encode())
                return
            
            calls = load_json('calls.json')
            calls[call_to] = {'from': call_from, 'type': call_type, 'time': time.time()}
            save_json('calls.json', calls)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return
        
        if path == '/api/call/status':
            call_user = params.get('user', [''])[0].lower()
            calls = load_json('calls.json')
            call_data = calls.get(call_user)
            if call_data and time.time() - call_data.get('time', 0) < 30:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'call': call_data}).encode())
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'call': None}).encode())
            return
        
        self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

print(f'Telega server: {PORT}')
socketserver.TCPServer.allow_reuse_address = True
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
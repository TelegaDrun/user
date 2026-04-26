from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(b'<html><body><h1>Telega works!</h1></body></html>')
    def log_message(self, s, *a): pass

threading.Thread(target=lambda: HTTPServer(('', 8080), Handler).serve_forever(), daemon=True).start()
print("Test server started")
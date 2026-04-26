# -*- mode: python; python-indent: 2 -*-
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

os.chdir('D:/telega-clone')

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format%args}")
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

print("Starting server on http://0.0.0.0:8080")
HTTPServer(('', 8080), Handler).serve_forever()
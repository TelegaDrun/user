import tkinter as tk
from tkinter import messagebox
import webbrowser
import threading
import socket
import os
import sys

def check_port(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('localhost', port))
        s.close()
        return False
    except Exception:
        return True

def start_server():
    if not check_port(8080):
        os.system('cd .. && python server.py &')
        threading.Thread(target=lambda: os.system('cd .. && start python server.py'), daemon=True).start()

class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('TelegaDrun')
        self.root.geometry('400x700')
        self.root.configure(bg='#1a1a2e')
        self.root.attributes('-topmost', False)
        
        # Header
        header = tk.Frame(self.root, bg='#161625', pady=12)
        header.pack(fill='x')
        tk.Label(header, text='TelegaDrun', font=('Arial', 18, 'bold'), bg='#161625', fg='white').pack()
        
        # Content
        content = tk.Frame(self.root, bg='#1a1a2e', padx=20, pady=40)
        content.pack(fill='both', expand=True)
        
        # Logo
        tk.Label(content, text='📱', font=('Arial', 80), bg='#1a1a2e').pack(pady=20)
        
        tk.Label(content, text='TelegaDrun', font=('Arial', 24, 'bold'), bg='#1a1a2e', fg='white').pack(pady=10)
        tk.Label(content, text='Чат приложение', font=('Arial', 14), bg='#1a1a2e', fg='#888').pack()
        
        # Status
        self.status = tk.Label(content, text='Проверка...', font=('Arial', 12), bg='#1a1a2e', fg='#4CAF50')
        self.status.pack(pady=20)
        
        # Buttons
        tk.Button(content, text='🚀 Запустить', command=self.launch, bg='#2481cc', fg='white', 
                  font=('Arial', 14, 'bold'), padx=30, pady=15, bd=0, cursor='hand2').pack(pady=10)
        tk.Button(content, text='📱 Открыть в браузере', command=self.open_browser, bg='#2a2a4a', fg='white',
                  font=('Arial', 12), padx=20, pady=10, bd=0, cursor='hand2').pack(pady=5)
        
        self.root.mainloop()
    
    def launch(self):
        start_server()
        self.status.config(text='Сервер запущен!', fg='#4CAF50')
        self.open_browser()
    
    def open_browser(self):
        if not check_port(8080):
            start_server()
        webbrowser.open('http://localhost:8080')

if __name__ == '__main__':
    App()
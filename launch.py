import sys
import subprocess

result = subprocess.run([sys.executable, 'server.py'], cwd=r'D:\telega-clone', creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS)
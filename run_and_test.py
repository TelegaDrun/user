import subprocess, sys, os, time

proc = subprocess.Popen(
    [sys.executable, "D:/telega-clone/server_debug.py"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for server to start
time.sleep(2)

# Test
import urllib.request
try:
    d = urllib.request.urlopen("http://127.0.0.1:8080/").read()
    print("SERVER RUNNING -", len(d), "bytes")
except Exception as e:
    print("Error:", e)
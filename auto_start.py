import subprocess
import sys

subprocess.Popen(
    [sys.executable, "D:\\telega-clone\\server.py"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
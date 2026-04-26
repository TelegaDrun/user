# -*- mode: python; python-indent: 2 -*-
import subprocess, sys, os
os.chdir('D:/telega-clone')
subprocess.call([sys.executable, 'server.py'],
    stdin=open(os.devnull),
    stdout=open(os.devnull, 'w'),
    stderr=open(os.devnull, 'w'),
    creationflags=0x08000000)  # CREATE_NO_WINDOW
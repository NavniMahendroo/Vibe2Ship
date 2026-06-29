import traceback
import sys
import os

print("Python version:", sys.version)
print("Cwd:", os.getcwd())

try:
    print("Importing app.main...")
    import app.main
    print("Import successful! Base metadata tables:", list(app.main.Base.metadata.tables.keys()))
except Exception as e:
    print("IMPORT FAILED!")
    traceback.print_exc()

import sys
import traceback
from app import auth, database, models, schemas

def test():
    print("Testing password hash...")
    try:
        h = auth.get_password_hash("password123")
        print("Hash success:", h)
    except Exception as e:
        print("Hash failed:")
        traceback.print_exc()

if __name__ == "__main__":
    test()

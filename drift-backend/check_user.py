from app.database import SessionLocal
from app import models

db = SessionLocal()
users = db.query(models.User).all()
for user in users:
    print(f"ID: {user.id}, Email: {user.email}, Name: {user.name}")
db.close()

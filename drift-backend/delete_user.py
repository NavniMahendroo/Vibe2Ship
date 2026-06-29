from app.database import SessionLocal
from app import models

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == 'lolol@gmail.com').first()
print('User exists:', user is not None)
if user:
    db.delete(user)
    db.commit()
    print('User deleted')
db.close()

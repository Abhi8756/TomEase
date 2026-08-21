import sys
import os
import uuid
import asyncio

# Add the current directory to sys.path so 'app' can be found
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import database as db
from app.auth import _hash_password

async def main():
    print("Connecting to database...")
    await db.connect()
    
    session = db.SessionLocal()
    try:
        from app.database import User
        print("Removing all users in the db...")
        num_deleted = session.query(User).delete()
        session.commit()
        print(f"Removed {num_deleted} accounts.")
        
        # Admin account credentials
        user_id = str(uuid.uuid4())
        email = "abhijit.potty@gmail.com"
        name = "Abhijit Potty"
        password = "abhi+1234"
        password_hash = _hash_password(password)
        role = "admin"
        
        print(f"Creating new admin account: {email}...")
        admin_user = User(
            id=user_id,
            email=email,
            name=name,
            password_hash=password_hash,
            role=role
        )
        session.add(admin_user)
        session.commit()
        print("Admin account created successfully!")
        
        # Verify
        users = session.query(User).all()
        print("Current users in db:")
        for u in users:
            print(f"- {u.email} ({u.role})")
            
    except Exception as e:
        session.rollback()
        print(f"Error resetting database: {e}")
    finally:
        session.close()
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())

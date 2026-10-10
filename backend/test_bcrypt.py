from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    password = "password123"
    print(f"Hashing password: {password}")
    hash = pwd_context.hash(password)
    print(f"Hash: {hash}")
    print("Verification:", pwd_context.verify(password, hash))
except Exception as e:
    print(f"Error: {e}")

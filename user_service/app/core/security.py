from passlib.context import CryptContext

password_hashing = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password):
    return password_hashing.hash(password)

def verify_password(plain_password, hashed_password):
    return password_hashing.verify(plain_password, hashed_password)
import redis
import json
from typing import Optional, Any
from app.core.config import settings

class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_URL,
            port=settings.REDIS_PORT,
            db=settings.USER_SERVICE_REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )

    def get(self, key): 
        #this is to get the user's data from the redis cache if it exists
        try:
            value = self.client.get(key)
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError as e:
                    print(f"Value for key {key} is not valid JSON: {e}")
                    return value
            return None
        except redis.RedisError as e:
            print(f"Redis error occurred: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return None
        
    def set(self, key, value, ex): #this then stores values in the redis cache temporarily
        try:
            json_value = json.dumps(value)
            self.client.set(key, json_value, ex)
        except (TypeError, ValueError) as e:
            print(f"Error setting value for key {key}: {e}")
        except redis.RedisError as e:
            print(f"Redis error occurred: {e}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

    def delete(self, key): #this removes value from the redis cache
        try:
            self.client.delete(key)
        except redis.RedisError as e:
            print(f"Redis error occurred: {e}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

    def ping(self): #put this to test redis conection
        try:
            return self.client.ping()
        except redis.RedisError as e:
            print(f"Redis error occurred: {e}")
            return False
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return False

    

redis_client = RedisClient()

try:
    if redis_client.ping():
        print("Connected to Redis")
    else:
        print("Redis connection failed")
except Exception as e:
    print(f"Redis connection error: {e}")
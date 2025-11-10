from fastapi import FastAPI

app = FastAPI()

app.post("/register")

app.post("/login")

app.get("users/{id}")

app.put("users/{id}")

app.delete("users/{id}")

app.get("users/me")
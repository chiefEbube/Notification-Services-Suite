FROM python:3.11-slim

WORKDIR /app


COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8081/api/v1/health/')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081"]

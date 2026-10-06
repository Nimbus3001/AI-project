FROM node:22-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install --silent
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-build /build/frontend/dist ./frontend/dist
RUN python scripts/preprocess_dataset.py
ENV PORT=3000
EXPOSE 3000
CMD ["python", "-m", "backend.app"]

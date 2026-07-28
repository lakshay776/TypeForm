FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Migrations and seeding run at container start rather than build time, because
# the SQLite file lives on a volume that only exists at runtime — at build time
# the mount point doesn't exist yet.
#
# `--if-empty` is what makes this safe to run on every deploy: it seeds a fresh
# database and leaves a populated one untouched, so a redeploy never destroys
# responses collected from the live link.
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed --if-empty && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

#!/bin/sh
set -e

# Ensure SQLite and Storage directories exist and have full write permissions
mkdir -p /app/prisma /app/storage/recordings /app/storage/downloads
chmod 777 /app/prisma 2>/dev/null || true
chmod -R 777 /app/storage 2>/dev/null || true
if [ -f /app/prisma/dev.db ]; then
  chmod 666 /app/prisma/dev.db 2>/dev/null || true
fi

echo "==> Running Prisma SQLite Database Push & Seed..."
npx prisma db push --accept-data-loss
node prisma/seed.js || true

# Re-ensure permissions after seed
chmod 777 /app/prisma 2>/dev/null || true
chmod 666 /app/prisma/* 2>/dev/null || true

echo "==> Starting AI Sales Agency & CRM System on Port 3000..."
exec "$@"

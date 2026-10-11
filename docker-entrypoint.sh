#!/bin/sh
set -e

# Ensure SQLite directory exists and has full write permissions for WAL mode
mkdir -p /app/prisma
chmod 777 /app/prisma 2>/dev/null || true
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

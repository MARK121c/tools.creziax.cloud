#!/bin/sh
set -e

echo "==> Running Prisma SQLite Database Push & Seed..."
npx prisma db push --accept-data-loss
node prisma/seed.js || true

echo "==> Starting AI Sales Agency & CRM System on Port 3000..."
exec "$@"

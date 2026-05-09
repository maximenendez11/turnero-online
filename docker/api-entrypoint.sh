#!/bin/sh
set -e
# Migraciones: se ejecutan dentro de la red de Coolify donde MySQL es accesible
cd /app && npx prisma migrate deploy --schema=api/prisma/schema.prisma
exec node dist/api/main.js

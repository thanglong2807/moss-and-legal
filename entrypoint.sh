#!/bin/sh
set -e

echo "Running Alembic migrations..."

# Detect stale revision (DB points to old file that no longer exists after squash).
# Run upgrade, capture output; if revision not found → stamp to squash base then retry.
set +e
MIGRATE_OUT=$(alembic upgrade head 2>&1)
MIGRATE_RC=$?
set -e

echo "$MIGRATE_OUT"

if echo "$MIGRATE_OUT" | grep -q "Can't locate revision"; then
  echo "Stale revision detected — stamping to squash base (0001_squash_all)..."
  alembic stamp --purge 0001_squash_all
  alembic upgrade head
elif [ $MIGRATE_RC -ne 0 ]; then
  echo "Migration failed!"
  exit $MIGRATE_RC
fi

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port ${APP_PORT:-8200}

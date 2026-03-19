#!/bin/sh
set -e

# Fix ownership of the bind-mounted data directory so the node user can write to it.
# This is needed because Docker creates host-side bind-mount directories as root.
chown -R node:node /app/data

exec gosu node node dist/index.js "$@"

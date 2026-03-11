#!/bin/bash
set -a
source /opt/gigzito/.env
set +a
cd /opt/gigzito
exec node dist/index.cjs

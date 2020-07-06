#!/bin/sh
set -e

if [ ! -z "$CONTAINER_RESOURCE_REQUEST_MEMORY" ]; then
  export MAX_OLD_SPACE=$(/usr/bin/node -pe 'Math.round(process.env.CONTAINER_RESOURCE_REQUEST_MEMORY / 1024 / 1024 / 100 * 75)')
  ADDITIONAL_ARGS="--max_old_space_size=$MAX_OLD_SPACE"
fi

if [ "$1" = "agent" ]; then
  TARGET_APP="/app/lib/apps/agent/index.js"
elif [ "$1" = "controller" ]; then
  TARGET_APP="/app/lib/apps/controller/index.js"
else
  echo "Unknown command: $1"
  exit 1
fi

# Pass through to the original node script
exec /usr/bin/node $ADDITIONAL_ARGS $TARGET_APP

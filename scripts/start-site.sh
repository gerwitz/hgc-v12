#!/bin/sh

# Run notifications independently so a slow or unavailable endpoint cannot block serving.
(
  echo "Gemini notifier: waiting for local services."
  attempt=0
  while [ "$attempt" -lt 30 ]
  do
    if curl --silent --fail --max-time 2 http://127.0.0.1/healthz >/dev/null 2>&1 \
      && nc -z -w 2 127.0.0.1 1965 >/dev/null 2>&1 \
      && nc -z -w 2 127.0.0.1 3000 >/dev/null 2>&1
    then
      echo "Gemini notifier: local services ready; checking public content."
      if ! node /opt/gemini-ping/gemini-ping.mjs /opt/gemini-ping/pings.json
      then
        echo "Gemini notifier: notification command failed; serving continues." >&2
      fi
      exit 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "Skipping Gemini pings: local services did not become ready." >&2
) &

# Preserve Calmserve's process supervision and signal handling beneath tini.
exec /usr/local/bin/start-calmserve

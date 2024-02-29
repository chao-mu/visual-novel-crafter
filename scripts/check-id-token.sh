#!/usr/bin/env bash

id_token=$1

if [ -z "$id_token" ]; then
  echo "Usage: $0 <id_token>"
  exit 1
fi


curl "https://oauth2.googleapis.com/tokeninfo?id_token=$id_token"

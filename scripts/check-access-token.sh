#!/usr/bin/env bash

access_token=$1

if [ -z "$access_token" ]; then
  echo "Usage: $0 <access_token>"
  exit 1
fi


curl "https://oauth2.googleapis.com/tokeninfo?access_token=$access_token"

#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./push-to-hf.sh <hf-username> [space-name]"
  echo "Example: ./push-to-hf.sh arka2126 krishisetu-ai"
  exit 1
fi

HF_USER="$1"
SPACE_NAME="${2:-krishisetu-ai}"

echo "Deploying ai-service to https://huggingface.co/spaces/$HF_USER/$SPACE_NAME ..."
echo "Note: When prompted for password, enter your Hugging Face Access Token (with 'write' permission)."
git subtree push --prefix ai-service "https://huggingface.co/spaces/$HF_USER/$SPACE_NAME" main

#!/usr/bin/env bash
set -e

# Usage:
#   ./push-to-hf.sh <hf-username> [space-name] [hf-token]
# Example:
#   ./push-to-hf.sh arka2126 krishisetu-ai hf_xxxxxxxxxxxx

if [ -z "$1" ]; then
  echo "=========================================================="
  echo "  🚀 Deploy KrishiSetu AI Service to Hugging Face Spaces"
  echo "=========================================================="
  echo ""
  echo "Usage:"
  echo "  ./push-to-hf.sh <hf-username> [space-name] [hf-token]"
  echo ""
  echo "Example:"
  echo "  ./push-to-hf.sh arka2126 krishisetu-ai"
  echo ""
  exit 1
fi

HF_USER="$1"
SPACE_NAME="${2:-krishisetu-ai}"
HF_TOKEN="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$SCRIPT_DIR"

if [ ! -f "$AI_DIR/Dockerfile" ]; then
  echo "Error: Dockerfile not found in $AI_DIR"
  exit 1
fi

if [ -z "$HF_TOKEN" ]; then
  echo ""
  echo "Please enter your Hugging Face Access Token (with WRITE role):"
  echo "(Get one at: https://huggingface.co/settings/tokens)"
  read -s -p "Token: " HF_TOKEN
  echo ""
fi

if [ -z "$HF_TOKEN" ]; then
  echo "Error: Hugging Face Token cannot be empty."
  exit 1
fi

REMOTE_URL="https://$HF_USER:$HF_TOKEN@huggingface.co/spaces/$HF_USER/$SPACE_NAME"
TMP_DIR=$(mktemp -d /tmp/hf_space_deploy_XXXXXX)

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo ""
echo "📦 Packaging ai-service for Hugging Face Spaces ($HF_USER/$SPACE_NAME)..."

# Copy all files from ai-service to temporary deployment folder, skipping venv and caches
rsync -av --exclude="venv" --exclude=".venv" --exclude="__pycache__" --exclude=".pytest_cache" --exclude=".git" "$AI_DIR/" "$TMP_DIR/" > /dev/null

cd "$TMP_DIR"

git init -b main > /dev/null
git config user.email "deploy@krishisetu.ai"
git config user.name "KrishiSetu Deployer"
git add .
git commit -m "Deploy KrishiSetu AI Microservice to Hugging Face Spaces" > /dev/null

echo "🚀 Pushing container image to Hugging Face..."
git push "$REMOTE_URL" main --force

echo ""
echo "=========================================================="
echo "  ✅ Successfully pushed to Hugging Face Spaces!"
echo "=========================================================="
echo ""
echo "Your space is building at: https://huggingface.co/spaces/$HF_USER/$SPACE_NAME"
echo "Your public API endpoint will be:"
echo "  👉 https://$HF_USER-$SPACE_NAME.hf.space"
echo ""
echo "Next step:"
echo "1. Wait 2 minutes for the Space status to turn green (Running)."
echo "2. In your Render Backend Dashboard -> Environment:"
echo "   Set AI_SERVICE_URL = https://$HF_USER-$SPACE_NAME.hf.space"
echo ""

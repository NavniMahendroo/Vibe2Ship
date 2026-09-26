#!/usr/bin/env bash
# [*] Drift 2.0 GCP Deployment Orchestration Script
set -eo pipefail

# Configuration parameters - Update these or pass them as env variables
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
REGION="us-central1"
SQL_INSTANCE_NAME="drift-db-instance"
SQL_DATABASE_NAME="drift"
SQL_USER="drift_admin"
SQL_PASSWORD=$(openssl rand -base64 16) # Automatically generate a secure password
JWT_SECRET_KEY=$(openssl rand -hex 32)
GEMINI_API_KEY="${GEMINI_API_KEY:-}" # Expects GEMINI_API_KEY from current environment

echo "=========================================================="
echo "[*] Starting Drift 2.0 GCP Deployment Orchestrator"
echo "=========================================================="

if [ -z "$PROJECT_ID" ]; then
  echo "[-] Error: No active gcloud project selected. Run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "[!] Warning: GEMINI_API_KEY is not set in your environment. You will need to add it manually in Cloud Run later."
fi

echo "[*] Target GCP Project: $PROJECT_ID"
echo "[*] Region: $REGION"
echo "[*] DB Instance: $SQL_INSTANCE_NAME"
echo "[*] DB Name: $SQL_DATABASE_NAME"

# 1. Enable GCP Service APIs
echo "[+] Enabling GCP Service APIs..."
gcloud services enable \
    sqladmin.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    firebase.googleapis.com

# 2. Provision Cloud SQL PostgreSQL Instance
echo "[+] Provisioning PostgreSQL 15 Instance on Cloud SQL (this may take a few minutes)..."
if ! gcloud sql instances describe "$SQL_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
  gcloud sql instances create "$SQL_INSTANCE_NAME" \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region="$REGION" \
      --project="$PROJECT_ID"
else
  echo "[OK] Cloud SQL instance '$SQL_INSTANCE_NAME' already exists. Skipping provisioning."
fi

# 3. Create database and user
echo "[+] Configuring database '$SQL_DATABASE_NAME' and user '$SQL_USER'..."
if ! gcloud sql databases describe "$SQL_DATABASE_NAME" --instance="$SQL_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
  gcloud sql databases create "$SQL_DATABASE_NAME" --instance="$SQL_INSTANCE_NAME" --project="$PROJECT_ID"
fi

if ! gcloud sql users list --instance="$SQL_INSTANCE_NAME" --project="$PROJECT_ID" | grep -q "$SQL_USER"; then
  gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE_NAME" --password="$SQL_PASSWORD" --project="$PROJECT_ID"
fi

# Fetch instance connection name
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" --format="value(connectionName)" --project="$PROJECT_ID")
echo "[OK] Connection Name: $INSTANCE_CONNECTION_NAME"

# 4. Build and Push Backend Container to Artifact Registry
echo "[+] Building and uploading backend container..."
REPO_NAME="drift-backend"
# Create Artifact Registry Repository if not exists
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location="$REGION" \
      --description="Drift 2.0 Backend Docker repository" \
      --project="$PROJECT_ID"
fi

IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/api:latest"
gcloud builds submit drift-backend/ --tag="$IMAGE_TAG" --project="$PROJECT_ID"

# 5. Deploy Container to Cloud Run
echo "[+] Deploying FastAPI backend to Cloud Run..."
DATABASE_URL="postgresql://$SQL_USER:$SQL_PASSWORD@/$SQL_DATABASE_NAME?host=/cloudsql/$INSTANCE_CONNECTION_NAME"

gcloud run deploy drift-backend-api \
    --image="$IMAGE_TAG" \
    --region="$REGION" \
    --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
    --set-env-vars="DATABASE_URL=$DATABASE_URL,GEMINI_API_KEY=$GEMINI_API_KEY,JWT_SECRET_KEY=$JWT_SECRET_KEY,JWT_ALGORITHM=HS256,ACCESS_TOKEN_EXPIRE_MINUTES=1440" \
    --allow-unauthenticated \
    --port=8000 \
    --project="$PROJECT_ID"

BACKEND_URL=$(gcloud run services describe drift-backend-api --platform=managed --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID")
echo "[OK] Deployed Backend API URL: $BACKEND_URL"

# 6. Build and Deploy Frontend to Firebase Hosting
echo "[+] Building and deploying React frontend..."
cd drift-frontend

# Inject API base URL for build
export VITE_API_BASE_URL="$BACKEND_URL"

# Build static assets
npm install
npm run build

# Deploy to Firebase Hosting
npx firebase-tools deploy --only hosting --project="$PROJECT_ID"

echo "=========================================================="
echo "[OK] Deployment Completed Successfully!"
echo "=========================================================="
echo "[*] Backend URL:  $BACKEND_URL"
echo "[*] DB Password: $SQL_PASSWORD"
echo "=========================================================="

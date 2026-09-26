# [*] Drift 2.0 GCP Deployment Orchestration Script for PowerShell
$ErrorActionPreference = "Continue"

# Configuration parameters - Update these or pass them
$ProjectID = (gcloud config get-value project 2>$null).Trim()
$Region = "us-central1"
$SQLInstanceName = "drift-db-instance"
$SQLDatabaseName = "drift"
$SQLUser = "drift_admin"

# Generate secure password and JWT secret key
$SQLPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})
$JWTSecretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$GeminiAPIKey = $env:GEMINI_API_KEY

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[*] Starting Drift 2.0 GCP Deployment Orchestrator (PowerShell)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not $ProjectID) {
    Write-Error "Error: No active gcloud project selected. Run 'gcloud config set project YOUR_PROJECT_ID' first."
}

if (-not $GeminiAPIKey) {
    Write-Warning "Warning: GEMINI_API_KEY is not set in your environment. You will need to add it manually in Cloud Run later."
}

Write-Host "[*] Target GCP Project: $ProjectID"
Write-Host "[*] Region: $Region"
Write-Host "[*] DB Instance: $SQLInstanceName"
Write-Host "[*] DB Name: $SQLDatabaseName"

# 1. Enable GCP Service APIs
Write-Host "[+] Enabling GCP Service APIs..."
gcloud services enable `
    sqladmin.googleapis.com `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    firebase.googleapis.com

# 2. Provision Cloud SQL PostgreSQL Instance
Write-Host "[+] Provisioning PostgreSQL 15 Instance on Cloud SQL (this may take a few minutes)..."
$instanceExists = gcloud sql instances describe $SQLInstanceName --project=$ProjectID 2>$null
if (-not $instanceExists) {
    gcloud sql instances create $SQLInstanceName `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$Region `
        --project=$ProjectID
} else {
    Write-Host "[OK] Cloud SQL instance '$SQLInstanceName' already exists. Skipping provisioning."
}

# 3. Create database and user
Write-Host "[+] Configuring database '$SQLDatabaseName' and user '$SQLUser'..."
$dbExists = gcloud sql databases describe $SQLDatabaseName --instance=$SQLInstanceName --project=$ProjectID 2>$null
if (-not $dbExists) {
    gcloud sql databases create $SQLDatabaseName --instance=$SQLInstanceName --project=$ProjectID
}

$userList = gcloud sql users list --instance=$SQLInstanceName --project=$ProjectID
if ($userList -notmatch $SQLUser) {
    gcloud sql users create $SQLUser --instance=$SQLInstanceName --password=$SQLPassword --project=$ProjectID
}

# Fetch instance connection name
$InstanceConnectionName = (gcloud sql instances describe $SQLInstanceName --format="value(connectionName)" --project=$ProjectID).Trim()
Write-Host "[OK] Connection Name: $InstanceConnectionName"

# 4. Build and Push Backend Container to Artifact Registry
Write-Host "[+] Building and uploading backend container..."
$RepoName = "drift-backend"
$repoExists = gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectID 2>$null
if (-not $repoExists) {
    gcloud artifacts repositories create $RepoName `
        --repository-format=docker `
        --location=$Region `
        --description="Drift 2.0 Backend Docker repository" `
        --project=$ProjectID
}

$ImageTag = "$Region-docker.pkg.dev/$ProjectID/$RepoName/api:latest"
gcloud builds submit drift-backend/ --tag=$ImageTag --project=$ProjectID

# 5. Deploy Container to Cloud Run
Write-Host "[+] Deploying FastAPI backend to Cloud Run..."
$DatabaseURL = "postgresql://${SQLUser}:${SQLPassword}@/${SQLDatabaseName}?host=/cloudsql/${InstanceConnectionName}"

gcloud run deploy drift-backend-api `
    --image=$ImageTag `
    --region=$Region `
    --add-cloudsql-instances=$InstanceConnectionName `
    --set-env-vars="DATABASE_URL=$DatabaseURL,GEMINI_API_KEY=$GeminiAPIKey,JWT_SECRET_KEY=$JWTSecretKey,JWT_ALGORITHM=HS256,ACCESS_TOKEN_EXPIRE_MINUTES=1440" `
    --allow-unauthenticated `
    --port=8000 `
    --project=$ProjectID

$BackendURL = (gcloud run services describe drift-backend-api --platform=managed --region=$Region --format="value(status.url)" --project=$ProjectID).Trim()
Write-Host "[OK] Deployed Backend API URL: $BackendURL" -ForegroundColor Green

# 6. Build and Deploy Frontend to Firebase Hosting
Write-Host "[+] Building and deploying React frontend..."
Push-Location drift-frontend

# Inject API base URL for build
$env:VITE_API_BASE_URL = $BackendURL

# Build static assets
npm install
npm run build

# Deploy to Firebase Hosting
npx firebase-tools deploy --only hosting --project=$ProjectID

Pop-Location

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[OK] Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[*] Backend URL:  $BackendURL" -ForegroundColor Green
Write-Host "[*] DB Password: $SQLPassword" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

#!/bin/bash
# Database Backup Script
# Run via cron: 0 */6 * * * /app/scripts/backup.sh

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Database backup
log_info "Starting database backup..."
BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable not set"
    exit 1
fi

# Perform pg_dump with compression
if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
    log_info "Database backup created: $BACKUP_FILE"
    log_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    log_error "Database backup failed"
    exit 1
fi

# Upload to S3/R2 if configured
if [ -n "$S3_BUCKET" ]; then
    log_info "Uploading backup to S3..."
    if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/db/$(basename "$BACKUP_FILE")"; then
        log_info "Backup uploaded to S3"
    else
        log_warn "S3 upload failed, keeping local backup"
    fi
fi

# Cleanup old local backups
log_info "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
log_info "Local cleanup complete"

# Cleanup old S3 backups if configured
if [ -n "$S3_BUCKET" ]; then
    log_info "Cleaning up old S3 backups..."
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://$S3_BUCKET/db/" | while read -r line; do
        filename=$(echo "$line" | awk '{print $4}')
        file_date=$(echo "$filename" | grep -oP '\d{8}' || echo "")
        
        if [ -n "$file_date" ] && [ "$file_date" -lt "$CUTOFF_DATE" ]; then
            log_info "Deleting old S3 backup: $filename"
            aws s3 rm "s3://$S3_BUCKET/db/$filename"
        fi
    done
    log_info "S3 cleanup complete"
fi

log_info "Backup process completed successfully at $TIMESTAMP"

# Output backup info for monitoring
echo "{\"timestamp\": \"$TIMESTAMP\", \"file\": \"$BACKUP_FILE\", \"size\": \"$(du -b "$BACKUP_FILE" | cut -f1)\", \"status\": \"success\"}"

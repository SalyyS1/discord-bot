#!/bin/bash
# Generate all required security secrets for SylaBot
# Usage: bash scripts/generate-secrets.sh >> .env

echo "# =================================================="
echo "# Security Secrets for SylaBot"
echo "# Generated on: $(date)"
echo "# =================================================="
echo ""
echo "# Manager API Key (hex format, 64 chars)"
echo "MANAGER_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""
echo "# Tenant Encryption Key (base64, 32 bytes)"
echo "TENANT_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo ""
echo "# Tenant Encryption Salt (base64, 32 bytes)"
echo "TENANT_ENCRYPTION_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo ""
echo "# Better Auth Secret (base64, 32 bytes)"
echo "BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"

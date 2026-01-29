/**
 * Safely quote a PostgreSQL identifier
 * Prevents SQL injection in schema/table names
 */
export function quoteIdentifier(identifier: string): string {
  // Validate: only alphanumeric and underscore allowed
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }

  // Length limit (PostgreSQL max is 63)
  if (identifier.length > 63) {
    throw new Error(`Identifier too long: ${identifier.length} chars (max 63)`);
  }

  // Double-quote and escape any quotes inside (defensive)
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Validate and generate tenant schema name
 */
export function getTenantSchemaName(tenantId: string): string {
  // Strict validation: UUID-like or alphanumeric only
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error(`Invalid tenant ID format: ${tenantId}`);
  }

  if (tenantId.length < 1 || tenantId.length > 50) {
    throw new Error(`Tenant ID length invalid: ${tenantId.length}`);
  }

  // Sanitize: remove any non-alphanumeric (defensive)
  const sanitized = tenantId.replace(/[^a-zA-Z0-9_]/g, '');

  return `tenant_${sanitized}`;
}

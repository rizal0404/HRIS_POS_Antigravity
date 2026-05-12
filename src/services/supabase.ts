/**
 * @deprecated This file is no longer used in VPS deployment.
 * All services now use apiClient.ts to communicate with the Express API backend.
 * This file is kept only as a tombstone to prevent broken imports during migration.
 * 
 * If you see an import referencing this file, update it to use:
 *   import api from '../services/apiClient';
 */

// Re-export api as a named export for any remaining legacy imports
export { default as supabase } from './apiClient';

console.warn(
    '[DEPRECATED] supabase.ts is deprecated. ' +
    'All services should import from apiClient.ts instead. ' +
    'See MIGRATION_GUIDE.md for details.'
);

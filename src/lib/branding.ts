import hrisLogo from '/HRIS_2.png';

export const defaultLogo = hrisLogo;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get brand logo URL from the API (or fallback to default).
 * In VPS deployment, branding assets are served from the API static files.
 */
export const getBrandLogoUrl = (): string => {
  return `${API_BASE_URL}/api/branding/logo`;
};

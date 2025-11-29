import { supabase } from '@/services/supabase';
import hrisLogo from '/HRIS_2.png';

export const defaultLogo = hrisLogo;
export const BRAND_BUCKET = 'branding';
export const BRAND_LOGO_PATH = 'logo.png';

export const getBrandLogoUrl = (): string => {
  const { data } = supabase.storage.from(BRAND_BUCKET).getPublicUrl(BRAND_LOGO_PATH);
  return data?.publicUrl || hrisLogo;
};

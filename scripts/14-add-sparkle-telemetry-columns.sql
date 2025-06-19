-- Add new columns to support additional Sparkle telemetry data
-- These columns capture more detailed system information sent by Sparkle

-- Add column for CPU 64-bit capability
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS cpu_64bit BOOLEAN;

-- Add column for CPU frequency in MHz
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS cpu_freq_mhz INT;

-- Add column for raw CPU type code (in addition to mapped cpu_arch)
-- This preserves the original value sent by Sparkle
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS cpu_type_raw TEXT;

-- Add column for CPU subtype code
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS cpu_subtype TEXT;

-- Add column to track which parameter was used for app identification
-- Values: 'bundleIdentifier', 'appName'
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS app_id_source TEXT;

-- Add indexes for new columns that might be queried
CREATE INDEX IF NOT EXISTS idx_reports_cpu_64bit ON public.reports(cpu_64bit);
CREATE INDEX IF NOT EXISTS idx_reports_app_id_source ON public.reports(app_id_source);

-- Add comment to document the new columns
COMMENT ON COLUMN public.reports.cpu_64bit IS 'Whether the CPU is 64-bit capable (from Sparkle cpu64bit parameter)';
COMMENT ON COLUMN public.reports.cpu_freq_mhz IS 'CPU frequency in MHz (from Sparkle cpuFreqMHz parameter)';
COMMENT ON COLUMN public.reports.cpu_type_raw IS 'Raw CPU type code as sent by Sparkle (e.g., "16777228" for ARM64, "7" for Intel)';
COMMENT ON COLUMN public.reports.cpu_subtype IS 'CPU subtype code from Sparkle';
COMMENT ON COLUMN public.reports.app_id_source IS 'How the app was identified: bundleIdentifier or appName';
-- Create reports_log table for tracking generated reports
CREATE TABLE IF NOT EXISTS public.reports_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'processing')),
  file_path TEXT,
  file_url TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(report_date)
);

-- Enable RLS on reports_log
ALTER TABLE public.reports_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage reports
CREATE POLICY "Admins can view all reports"
  ON public.reports_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert reports"
  ON public.reports_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports"
  ON public.reports_log
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for reports bucket
CREATE POLICY "Admins can upload reports"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

CREATE POLICY "Admins can view reports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete reports"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'reports' AND
    has_role(auth.uid(), 'admin'::app_role)
  );
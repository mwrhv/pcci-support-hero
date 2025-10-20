-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Create RLS policies for ticket attachments
CREATE POLICY "Users can upload attachments for their tickets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view attachments for tickets they have access to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
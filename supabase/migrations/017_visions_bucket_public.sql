-- Fix: make visions storage bucket public so vision images load correctly
UPDATE storage.buckets SET public = true WHERE id = 'visions';

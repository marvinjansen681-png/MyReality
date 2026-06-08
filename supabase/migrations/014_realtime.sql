-- Enable realtime on these tables only
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Rollback de 012_security_events.sql
DROP INDEX IF EXISTS idx_security_events_user_time;
DROP INDEX IF EXISTS idx_security_events_type_time;
DROP INDEX IF EXISTS idx_security_events_ip_time;
DROP INDEX IF EXISTS idx_security_events_severity;
DROP TABLE IF EXISTS security_events;

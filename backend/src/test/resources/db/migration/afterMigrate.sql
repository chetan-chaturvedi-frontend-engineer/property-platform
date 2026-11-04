-- Flyway callback, on the test classpath only. Tests reset data with TRUNCATE users CASCADE, which reaches
-- system_logs. SystemLogSchemaTests re-enables this trigger to cover it.
ALTER TABLE system_logs DISABLE TRIGGER trg_system_logs_no_truncate;

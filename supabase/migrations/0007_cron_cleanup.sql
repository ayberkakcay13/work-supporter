-- session-alarm işi 15 sn'de bir çalıştığı için cron kayıtları hızla birikir; her gece eskileri silinir.
select cron.schedule(
  'cron-log-cleanup',
  '0 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$
);

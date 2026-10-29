-- pgTAP smoke test. Proves the test harness runs in CI.
-- Real RLS / role / guard tests arrive with the schema in Phase 1.
begin;
create extension if not exists pgtap;

select plan(1);

select ok(true, 'pgTAP harness runs');

select * from finish();
rollback;

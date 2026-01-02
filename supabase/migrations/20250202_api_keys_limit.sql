-- ============================================
-- API KEY LIMIT (2 per budget)
-- ============================================

do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'api_keys'
  ) then
    create or replace function public.enforce_api_key_limit()
    returns trigger as $fn$
    begin
      if (
        select count(*)
        from public.api_keys
        where user_id = new.user_id
          and budget_id = new.budget_id
      ) >= 2 then
        raise exception 'API key limit reached';
      end if;
      return new;
    end;
    $fn$ language plpgsql;

    drop trigger if exists api_key_limit on public.api_keys;
    create trigger api_key_limit
      before insert on public.api_keys
      for each row execute procedure public.enforce_api_key_limit();
  end if;
end $$;

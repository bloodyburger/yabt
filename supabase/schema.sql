-- YABT Budget Application Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  currency_code char(3) default 'USD',
  date_format text default 'YYYY-MM-DD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- BUDGETS
-- ============================================
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  currency_code char(3) default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to create default budget on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.budgets (user_id, name, currency_code)
  values (new.id, 'My Budget', new.currency_code);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute procedure public.handle_new_profile();

-- ============================================
-- ACCOUNTS (bank accounts, credit cards, etc.)
-- ============================================
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade not null,
  name text not null,
  account_type text not null check (account_type in ('checking', 'savings', 'credit_card', 'cash', 'loan', 'tracking')),
  balance numeric(12,2) default 0,
  cleared_balance numeric(12,2) default 0,
  uncleared_balance numeric(12,2) default 0,
  is_on_budget boolean default true,
  interest_rate numeric(5,2),
  minimum_payment numeric(12,2),
  note text,
  closed boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CATEGORY GROUPS
-- ============================================
create table if not exists category_groups (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade not null,
  name text not null,
  is_hidden boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CATEGORIES
-- ============================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  category_group_id uuid references category_groups(id) on delete cascade not null,
  name text not null,
  target_type text check (target_type in ('none', 'target_balance', 'target_balance_by_date', 'monthly_spending', 'weekly_contribution', 'monthly_contribution')),
  target_amount numeric(12,2),
  target_date date,
  is_hidden boolean default false,
  sort_order int default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MONTHLY BUDGETS (allocation per category per month)
-- ============================================
create table if not exists monthly_budgets (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete cascade not null,
  month date not null, -- Always first of the month (e.g., 2024-01-01)
  budgeted numeric(12,2) default 0,
  activity numeric(12,2) default 0,
  available numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category_id, month)
);

-- ============================================
-- PAYEES
-- ============================================
create table if not exists payees (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TRANSACTIONS
-- ============================================
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references accounts(id) on delete cascade not null,
  category_id uuid references categories(id),
  payee_id uuid references payees(id),
  transfer_account_id uuid references accounts(id),
  date date not null,
  amount numeric(12,2) not null, -- Positive = inflow, Negative = outflow
  memo text,
  cleared boolean default false,
  approved boolean default true,
  flag_color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SCHEDULED TRANSACTIONS
-- ============================================
create table if not exists scheduled_transactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references accounts(id) on delete cascade not null,
  category_id uuid references categories(id),
  payee_id uuid references payees(id),
  frequency text not null check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  next_date date not null,
  amount numeric(12,2) not null,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- NET WORTH SNAPSHOTS (for reports)
-- ============================================
create table if not exists net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade not null,
  date date not null,
  assets numeric(12,2) not null,
  liabilities numeric(12,2) not null,
  net_worth numeric(12,2) not null,
  created_at timestamptz default now(),
  unique(budget_id, date)
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table budgets enable row level security;
alter table accounts enable row level security;
alter table category_groups enable row level security;
alter table categories enable row level security;
alter table monthly_budgets enable row level security;
alter table payees enable row level security;
alter table transactions enable row level security;
alter table scheduled_transactions enable row level security;
alter table net_worth_snapshots enable row level security;

-- Profiles: Users can only access their own profile
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Budgets: Users can only access their own budgets
drop policy if exists "Users can view own budgets" on budgets;
create policy "Users can view own budgets"
  on budgets for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own budgets" on budgets;
create policy "Users can insert own budgets"
  on budgets for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own budgets" on budgets;
create policy "Users can update own budgets"
  on budgets for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own budgets" on budgets;
create policy "Users can delete own budgets"
  on budgets for delete using (auth.uid() = user_id);

-- Accounts: Access through budget ownership
drop policy if exists "Users can access accounts" on accounts;
create policy "Users can access accounts"
  on accounts for all using (
    budget_id in (select id from budgets where user_id = auth.uid())
  );

-- Category Groups: Access through budget ownership
drop policy if exists "Users can access category_groups" on category_groups;
create policy "Users can access category_groups"
  on category_groups for all using (
    budget_id in (select id from budgets where user_id = auth.uid())
  );

-- Categories: Access through category group -> budget ownership
drop policy if exists "Users can access categories" on categories;
create policy "Users can access categories"
  on categories for all using (
    category_group_id in (
      select id from category_groups where budget_id in (
        select id from budgets where user_id = auth.uid()
      )
    )
  );

-- Monthly Budgets: Access through category -> category group -> budget
drop policy if exists "Users can access monthly_budgets" on monthly_budgets;
create policy "Users can access monthly_budgets"
  on monthly_budgets for all using (
    category_id in (
      select c.id from categories c
      join category_groups cg on c.category_group_id = cg.id
      where cg.budget_id in (select id from budgets where user_id = auth.uid())
    )
  );

-- Payees: Access through budget ownership
drop policy if exists "Users can access payees" on payees;
create policy "Users can access payees"
  on payees for all using (
    budget_id in (select id from budgets where user_id = auth.uid())
  );

-- Transactions: Access through account -> budget ownership
drop policy if exists "Users can access transactions" on transactions;
create policy "Users can access transactions"
  on transactions for all using (
    account_id in (
      select id from accounts where budget_id in (
        select id from budgets where user_id = auth.uid()
      )
    )
  );

-- Scheduled Transactions: Access through account -> budget
drop policy if exists "Users can access scheduled_transactions" on scheduled_transactions;
create policy "Users can access scheduled_transactions"
  on scheduled_transactions for all using (
    account_id in (
      select id from accounts where budget_id in (
        select id from budgets where user_id = auth.uid()
      )
    )
  );

-- Net Worth Snapshots: Access through budget ownership
drop policy if exists "Users can access net_worth_snapshots" on net_worth_snapshots;
create policy "Users can access net_worth_snapshots"
  on net_worth_snapshots for all using (
    budget_id in (select id from budgets where user_id = auth.uid())
  );

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_budgets_user_id on budgets(user_id);
create index if not exists idx_accounts_budget_id on accounts(budget_id);
create index if not exists idx_category_groups_budget_id on category_groups(budget_id);
create index if not exists idx_categories_group_id on categories(category_group_id);
create index if not exists idx_monthly_budgets_category_month on monthly_budgets(category_id, month);
create index if not exists idx_payees_budget_id on payees(budget_id);
create index if not exists idx_transactions_account_id on transactions(account_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category_id on transactions(category_id);
create index if not exists idx_scheduled_transactions_account_id on scheduled_transactions(account_id);
create index if not exists idx_net_worth_snapshots_budget_date on net_worth_snapshots(budget_id, date);

-- ============================================
-- FUNCTIONS FOR BUDGET CALCULATIONS
-- ============================================

-- Function to recalculate monthly budget available amount
create or replace function recalculate_monthly_budget(p_category_id uuid, p_month date)
returns void as $$
declare
  v_budgeted numeric(12,2);
  v_activity numeric(12,2);
  v_prev_available numeric(12,2);
  v_new_available numeric(12,2);
  v_first_of_month date;
  v_first_of_prev_month date;
begin
  -- Normalize to first of month
  v_first_of_month := date_trunc('month', p_month)::date;
  v_first_of_prev_month := (date_trunc('month', p_month) - interval '1 month')::date;
  
  -- Get current month's budgeted amount
  select coalesce(budgeted, 0) into v_budgeted
  from monthly_budgets
  where category_id = p_category_id and month = v_first_of_month;
  
  -- Calculate activity (sum of transactions for this category in this month)
  select coalesce(sum(t.amount), 0) into v_activity
  from transactions t
  join accounts a on t.account_id = a.id
  join categories c on t.category_id = c.id
  where t.category_id = p_category_id
    and date_trunc('month', t.date) = v_first_of_month
    and a.is_on_budget = true;
  
  -- Get previous month's available (carried over)
  select coalesce(available, 0) into v_prev_available
  from monthly_budgets
  where category_id = p_category_id and month = v_first_of_prev_month;
  
  -- Calculate new available: carried over + budgeted + activity (activity is negative for expenses)
  v_new_available := v_prev_available + v_budgeted + v_activity;
  
  -- Upsert the monthly budget
  insert into monthly_budgets (category_id, month, budgeted, activity, available)
  values (p_category_id, v_first_of_month, v_budgeted, v_activity, v_new_available)
  on conflict (category_id, month)
  do update set
    activity = v_activity,
    available = v_new_available,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- Function to get "Ready to Assign" amount for a budget in a given month
create or replace function get_ready_to_assign(p_budget_id uuid, p_month date)
returns numeric(12,2) as $$
declare
  v_total_income numeric(12,2);
  v_total_budgeted numeric(12,2);
  v_first_of_month date;
begin
  v_first_of_month := date_trunc('month', p_month)::date;
  
  -- Total income up to and including this month
  select coalesce(sum(t.amount), 0) into v_total_income
  from transactions t
  join accounts a on t.account_id = a.id
  where a.budget_id = p_budget_id
    and a.is_on_budget = true
    and t.category_id is null -- Income transactions have no category
    and t.amount > 0
    and t.date <= (v_first_of_month + interval '1 month' - interval '1 day')::date;
  
  -- Total budgeted up to and including this month
  select coalesce(sum(mb.budgeted), 0) into v_total_budgeted
  from monthly_budgets mb
  join categories c on mb.category_id = c.id
  join category_groups cg on c.category_group_id = cg.id
  where cg.budget_id = p_budget_id
    and mb.month <= v_first_of_month;
  
  return v_total_income - v_total_budgeted;
end;
$$ language plpgsql security definer;

-- ============================================
-- API KEYS (for iOS Shortcuts integration)
-- ============================================
create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  budget_id uuid references budgets(id) on delete cascade not null,
  name text not null default 'iOS Shortcut',
  key_hash text not null,  -- Store hash, not plaintext
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- RLS for api_keys
alter table api_keys enable row level security;

create policy "Users can view own API keys" on api_keys
  for select using (auth.uid() = user_id);
create policy "Users can insert own API keys" on api_keys
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own API keys" on api_keys
  for delete using (auth.uid() = user_id);

-- Limit API keys to 2 per budget
create or replace function enforce_api_key_limit()
returns trigger as $$
begin
  if (
    select count(*)
    from api_keys
    where user_id = new.user_id
      and budget_id = new.budget_id
  ) >= 2 then
    raise exception 'API key limit reached';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists api_key_limit on api_keys;
create trigger api_key_limit
  before insert on api_keys
  for each row execute procedure enforce_api_key_limit();

-- Indexes for api_keys
create unique index if not exists idx_api_keys_key_hash on api_keys(key_hash);
create index if not exists idx_api_keys_budget_id on api_keys(budget_id);

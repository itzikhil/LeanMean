-- Cleanup: food_logs rows where a gram weight leaked into `qty`
--
-- Background: api/parse-meal + api/parse-plate used to return e.g. "138 grams of
-- chicken" as qty:138, and App.tsx computes day totals as kcal * qty — so a single
-- bad row could add tens of thousands of kcal to a day. The prompts and the
-- server-side normalizer in api/_parsed.ts now prevent this, but rows logged
-- before that fix are still in the table and still skewing history.
--
-- The threshold below (qty > 20) matches MAX_QTY in api/_parsed.ts.
-- The fix mirrors what the normalizer now does: set qty = 1 and leave the macros
-- alone. It does NOT delete anything.
--
-- Run the steps IN ORDER, in the Supabase SQL editor. Read the output of each
-- step before moving to the next. Steps 1, 2 and 5a are read-only.
--
-- ⚠️  The SQL editor runs with a role that BYPASSES row-level security, so these
--     statements see every user_id in the table, not just your current session.
--     That is usually what you want here: `signInAnonymously()` mints a NEW user
--     on any session loss, so your own history may be spread across several
--     user_ids. If you'd rather scope to one, add `and user_id = '<uuid>'` to
--     every where-clause below.


-- ---------------------------------------------------------------------------
-- Step 1 (read-only) — what would change?
-- Eyeball this before touching anything. Every row here will have its qty
-- reset to 1. A legitimate qty above 20 is implausible (adds go in at qty 1 and
-- the ± buttons step by 0.5), but confirm none of these look intentional.
-- ---------------------------------------------------------------------------
select
  id,
  date,
  meal,
  name,
  qty,
  kcal                      as kcal_per_serving,
  round(kcal * qty)         as logged_kcal,
  round(kcal)               as kcal_after_fix,
  round(kcal * qty - kcal)  as kcal_removed
from public.food_logs
where qty > 20
order by date desc, qty desc;


-- ---------------------------------------------------------------------------
-- Step 2 (read-only) — day-level impact
-- Full before/after day totals, so you can see which days in Trends were skewed
-- and by how much.
-- ---------------------------------------------------------------------------
select
  date,
  count(*) filter (where qty > 20)                                  as bad_rows,
  round(sum(kcal * qty))                                            as day_kcal_now,
  round(sum(kcal * case when qty > 20 then 1 else qty end))         as day_kcal_after,
  round(sum(kcal * qty) - sum(kcal * case when qty > 20 then 1 else qty end))
                                                                    as day_kcal_removed
from public.food_logs
group by date
having count(*) filter (where qty > 20) > 0
order by date desc;


-- ---------------------------------------------------------------------------
-- Step 3 — snapshot the affected rows before changing them
-- RLS is enabled with no policy so the backup is unreachable from the client
-- API (service role only). Drop the table once you're happy with the result.
-- ---------------------------------------------------------------------------
create table if not exists public.food_logs_qty_backup as
select *, now() as backed_up_at
from public.food_logs
where qty > 20;

alter table public.food_logs_qty_backup enable row level security;

select count(*) as rows_backed_up from public.food_logs_qty_backup;


-- ---------------------------------------------------------------------------
-- Step 4 — the fix
-- Run as one block. Check that `rows_fixed` matches the count from step 1,
-- then COMMIT. If it doesn't match, run ROLLBACK; instead.
-- ---------------------------------------------------------------------------
begin;

with fixed as (
  update public.food_logs
  set qty = 1
  where qty > 20
  returning 1
)
select count(*) as rows_fixed from fixed;

-- Inspect rows_fixed above, then run exactly one of:
commit;
-- rollback;


-- ---------------------------------------------------------------------------
-- Step 5a (read-only) — while you're here: stray meal slots
-- Retired slots ('prewo', 'extras') and any hallucinated value ('brunch', …)
-- render in NO meal group in LogList, so those entries are invisible in the day
-- view but still counted in the totals. migrateMeals() in src/lib/db.ts rewrites
-- prewo/extras on login, but nothing else — this catches the rest.
-- ---------------------------------------------------------------------------
select meal, count(*) as rows, min(date) as first_seen, max(date) as last_seen
from public.food_logs
where meal not in ('breakfast', 'lunch', 'dinner', 'snack')
group by meal
order by rows desc;


-- ---------------------------------------------------------------------------
-- Step 5b — only if step 5a returned rows
-- ---------------------------------------------------------------------------
begin;

update public.food_logs
set meal = 'snack'
where meal not in ('breakfast', 'lunch', 'dinner', 'snack');

commit;


-- ---------------------------------------------------------------------------
-- Step 6 (read-only) — verify. Both should return 0.
-- ---------------------------------------------------------------------------
select
  count(*) filter (where qty > 20)                                          as remaining_high_qty,
  count(*) filter (where meal not in ('breakfast','lunch','dinner','snack')) as remaining_bad_meals
from public.food_logs;


-- Once the numbers look right in the app:
-- drop table public.food_logs_qty_backup;

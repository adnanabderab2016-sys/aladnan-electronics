/*
# Fix: Set search_path on update_updated_at_column function

## Changes
- Recreate the `update_updated_at_column` function with an explicit `search_path` parameter set to `public`.
- This resolves the security advisor warning about mutable search_path on functions.

## Security
- No data changes — only function definition updated.
- Prevents search_path injection attacks.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

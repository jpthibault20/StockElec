-- Stock history recorded by the database, and atomic quantity adjustment.

-- ---------------------------------------------------------------------------
-- Every quantity or location change of an item is logged in stock_movements,
-- whatever screen made it. Runs with the caller's rights, so RLS still applies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_item_movement() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity > 0 THEN
      INSERT INTO public.stock_movements (user_id, item_id, type, delta, to_location_id)
      VALUES (NEW.user_id, NEW.id, 'add', NEW.quantity, NEW.location_id);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    INSERT INTO public.stock_movements (user_id, item_id, type, delta)
    VALUES (
      NEW.user_id,
      NEW.id,
      CASE WHEN NEW.quantity > OLD.quantity THEN 'add' ELSE 'remove' END::public.movement_type,
      NEW.quantity - OLD.quantity
    );
  END IF;

  IF NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    INSERT INTO public.stock_movements (user_id, item_id, type, delta, from_location_id, to_location_id)
    VALUES (NEW.user_id, NEW.id, 'move', 0, OLD.location_id, NEW.location_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER items_log_movement
  AFTER INSERT OR UPDATE OF quantity, location_id ON items
  FOR EACH ROW EXECUTE FUNCTION public.log_item_movement();

-- ---------------------------------------------------------------------------
-- +1 / −1 from the UI: increments in one statement so fast repeated taps never
-- lose an update. Quantity never goes below 0. Returns the new quantity.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_item_quantity(p_item_id uuid, p_delta numeric)
  RETURNS numeric
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
  AS $$
DECLARE
  v_quantity numeric;
BEGIN
  UPDATE public.items
  SET quantity = GREATEST(quantity + p_delta, 0)
  WHERE id = p_item_id
  RETURNING quantity INTO v_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found', p_item_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_item_quantity(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_item_quantity(uuid, numeric) TO authenticated;

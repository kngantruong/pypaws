-- PyPaws: coordinates are mandatory because matching uses geographic radius.
-- Current production check (2026-11-02): 29 posts, 0 missing coordinates.
DO $$
DECLARE
    missing_count bigint;
BEGIN
    SELECT COUNT(*)
      INTO missing_count
      FROM public.posts
     WHERE latitude IS NULL OR longitude IS NULL;

    IF missing_count > 0 THEN
        RAISE EXCEPTION
            'Cannot require post coordinates: % existing posts have missing latitude/longitude. Backfill them from verified map selections first.',
            missing_count;
    END IF;
END
$$;

ALTER TABLE public.posts
    ALTER COLUMN latitude SET NOT NULL,
    ALTER COLUMN longitude SET NOT NULL;

-- Idempotent dev/bootstrap data; runs after migrations via the db:seed turbo task.
-- One row per sites/<slug> app. The name can be edited in the admin afterwards.
INSERT INTO sites (id, slug, name, updated_at)
VALUES (uuidv7(), 'james', 'James', now())
ON CONFLICT (slug) DO NOTHING;

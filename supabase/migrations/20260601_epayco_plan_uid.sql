-- Agrega el UID interno de ePayco a cada plan (necesario para /plan/edit/{uid})
ALTER TABLE epayco_plan_config
  ADD COLUMN IF NOT EXISTS epayco_uid TEXT;

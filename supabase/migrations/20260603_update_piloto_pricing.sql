-- Actualizar precios del plan Piloto: $20.000/mes, 30 días de prueba
UPDATE epayco_plan_config
SET amount = 20000, trial_days = 30, updated_at = now()
WHERE plan_key = 'piloto' AND billing = 'monthly';

UPDATE epayco_plan_config
SET amount = 200000, trial_days = 30, updated_at = now()
WHERE plan_key = 'piloto' AND billing = 'annual';

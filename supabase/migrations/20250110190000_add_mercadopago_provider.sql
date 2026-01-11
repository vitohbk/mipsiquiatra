DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'mercadopago'
      AND enumtypid = 'payment_provider'::regtype
  ) THEN
    ALTER TYPE payment_provider ADD VALUE 'mercadopago';
  END IF;
END $$;

-- TE CUIDA - 056: conservar codigos municipales visibles para gestores

BEGIN;

ALTER TABLE public.municipal_invite_codes
  ADD COLUMN IF NOT EXISTS code_value text;

COMMENT ON COLUMN public.municipal_invite_codes.code_value IS
  'Codigo municipal completo visible para administradores autorizados. Los registros anteriores pueden ser NULL porque solo se almacenaba hash.';

COMMIT;

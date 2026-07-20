-- TE CUIDA - 052: invitaciones directas para gestores municipales

BEGIN;

CREATE TABLE IF NOT EXISTS public.municipal_manager_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  email text NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptada', 'cancelada')),
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS municipal_manager_invitations_municipality_idx
  ON public.municipal_manager_invitations(municipality_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS municipal_manager_invitations_pending_email_idx
  ON public.municipal_manager_invitations(lower(email))
  WHERE estado = 'pendiente';

ALTER TABLE public.municipal_manager_invitations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.municipal_manager_invitations IS
  'Invitaciones de gestores creadas por el superadministrador; acceso exclusivo mediante service_role.';

COMMIT;

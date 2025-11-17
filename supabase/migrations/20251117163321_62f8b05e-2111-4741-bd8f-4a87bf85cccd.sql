-- Criar usuário admin Bruno Carvalho
DO $$
DECLARE
  admin_user_id uuid := '41609194-3e2a-489d-9d1e-c423dc8f57b8';
BEGIN
  -- Inserir usuário no auth.users (se não existir)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    'bsouza14@gmail.com',
    crypt('24681249', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome_completo":"Bruno Carvalho"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Inserir perfil (se não existir)
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (admin_user_id, 'bsouza14@gmail.com', 'Bruno Carvalho')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = EXCLUDED.nome_completo;

  -- Atribuir role de gestor (se não existir)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'gestor')
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;
-- Adicionar coluna de carga horária nos cursos
ALTER TABLE cursos ADD COLUMN carga_horaria integer;

COMMENT ON COLUMN cursos.carga_horaria IS 'Carga horária total do curso em horas';
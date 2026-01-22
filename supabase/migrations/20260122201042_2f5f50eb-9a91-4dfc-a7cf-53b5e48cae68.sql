-- Add 'em_admissao' to the employee_status enum
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'em_admissao' BEFORE 'ativo';
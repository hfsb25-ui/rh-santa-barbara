# Architecture rules

- Imported payslip PDFs live in `holerite_documentos` and private storage, never in `folha_pagamento`; this keeps uploaded documents out of payroll calculations and manual entries.
- Employees cannot read imported payslip files before signing; the signing function reads the private original and releases the signed copy afterward.
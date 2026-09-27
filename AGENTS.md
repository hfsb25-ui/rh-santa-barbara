# Architecture rules

- Imported payslip PDFs live in `holerite_documentos` and private storage, never in `folha_pagamento`; this keeps uploaded documents out of payroll calculations and manual entries.
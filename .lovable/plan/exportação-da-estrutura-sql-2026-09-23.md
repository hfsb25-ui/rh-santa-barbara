# Exportação da estrutura SQL

## Objetivo
Adicionar em **Configurações → Backup** uma opção separada para o gestor baixar a estrutura do banco em arquivo `.sql`, complementando a exportação de dados existente.

## Implementação
1. Criar uma função protegida que gere a estrutura do esquema público: tipos, tabelas, sequências, restrições, índices, funções, gatilhos, políticas de acesso e permissões.
2. Criar uma função de exportação exclusiva para gestores, com validação de sessão e entrega do arquivo SQL.
3. Adicionar o botão **Exportar estrutura SQL** ao lado das opções atuais, com progresso e download automático.
4. Manter as exportações JSON e SQL de dados sem alterações.

## Validação
- Confirmar que somente gestor consegue exportar.
- Verificar que o arquivo contém início e fim identificáveis e os comandos necessários para reconstruir a estrutura pública.
- Verificar o download pela tela de Backup.

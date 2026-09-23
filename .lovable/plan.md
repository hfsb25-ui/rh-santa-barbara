# Exportação SQL pelo próprio sistema

## Objetivo
Adicionar em **Configurações → Backup** um botão para o gestor baixar os dados do sistema em um arquivo `.sql`, pronto para carregar em outro projeto PostgreSQL/Supabase depois que a estrutura do sistema estiver criada.

## Implementação
1. Criar uma função segura no banco que percorra as tabelas públicas e transforme todos os registros em comandos SQL, sem depender de uma lista manual de tabelas.
2. Restringir a exportação ao perfil **gestor**, mantendo usuários comuns e administradores parciais sem acesso.
3. Criar uma função de exportação que entregue o arquivo em partes para evitar falhas por volume e inclua transação, tratamento de chaves estrangeiras e preservação dos valores originais.
4. Adicionar o botão **Exportar em SQL** na área de Backup, com progresso, mensagens de erro claras e download automático com data e hora.
5. Manter as opções atuais de backup e importação JSON sem alterações.

## Limite da exportação
O arquivo SQL conterá todos os dados das tabelas públicas do sistema. A estrutura do banco, usuários de acesso, arquivos armazenados e segredos não serão incluídos; a estrutura deve existir no destino antes da importação.

## Validação
- Confirmar que somente gestor consegue exportar.
- Gerar o arquivo e verificar cabeçalho, tabelas, caracteres especiais, valores nulos e fechamento da transação.
- Verificar a tela de Backup e o download no navegador.



## Plano: Tela de Lock Screen

### Visão Geral

Criar uma tela de bloqueio (lock screen) que aparece quando o sistema detecta inatividade do usuário. Após um período sem interação, a tela escurece com efeito blur, mostrando hora, data e avatar do usuário. Para desbloquear, o usuário digita a senha.

### Funcionamento

```text
Usuário logado → Inatividade (5 min) → Lock Screen exibe
                                         ↓
                              Usuário digita senha → Valida → Desbloqueia
                                         ↓ (erro)
                              Mostra erro, tenta novamente
                              Botão "Trocar conta" → /auth
```

### Componentes

#### 1. `src/components/layout/LockScreen.tsx` (novo)
- Overlay fullscreen com backdrop blur e fundo escuro semi-transparente
- Relógio digital grande (hora e data em português)
- Avatar/ícone do usuário com nome
- Campo de senha para desbloquear
- Botão "Trocar conta" que redireciona para /auth
- Animação suave de entrada (fade + slide up)

#### 2. `src/hooks/useInactivityLock.ts` (novo)
- Hook que monitora mouse, teclado e toque
- Timer configurável (padrão: 5 minutos)
- Estado `isLocked` controlado pelo hook
- Reset do timer a cada interação
- Função `unlock(password)` que valida a senha no backend

#### 3. `src/components/layout/AppLayout.tsx` (editar)
- Integrar o hook `useInactivityLock`
- Renderizar `<LockScreen>` quando `isLocked === true`

### Design Visual
- Fundo com gradiente escuro + blur do conteúdo por trás
- Relógio em fonte grande e leve (light weight)
- Data formatada em português ("Domingo, 5 de Abril")
- Input de senha centralizado, minimalista, sem borda
- Transição suave ao bloquear/desbloquear

### Arquivos
- `src/hooks/useInactivityLock.ts` — novo
- `src/components/layout/LockScreen.tsx` — novo
- `src/components/layout/AppLayout.tsx` — integrar lock screen


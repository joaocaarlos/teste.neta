# Acessibilidade — CapaCity

Este documento descreve as práticas de acessibilidade adotadas e como validá-las.

## Padrão alvo

**WCAG 2.1 nível AA**, incluindo:

- Contraste mínimo 4.5:1 para texto pequeno (3:1 para texto grande)
- Navegação completa por teclado
- ARIA labels em controles interativos
- Foco visível em todos elementos focáveis
- Reduced motion respeitado
- Suporte a screen readers (NVDA, VoiceOver, JAWS)
- Idioma da página declarado (`lang` no `<html>`)

## Componentes acessíveis

Todos componentes em `frontend/src/components/ui/` seguem as regras:

| Componente | Práticas |
|------------|-----------|
| `Badge`    | Texto descritivo, contraste verificado por variant |
| `Skeleton` | `role="status"`, `aria-busy="true"`, `aria-label="Carregando"` |
| `Spinner`  | `role="status"`, label visualmente oculto para SR |
| `EmptyState` | `role="status"`, ícone com `aria-hidden`, ação com label clara |
| `ErrorBoundary` | `role="alert"`, `aria-live="assertive"` |
| `ThemeToggle` | `aria-label` dinâmico, foco visível |
| `LanguageSelector` | `<select>` nativo, `aria-label` |

## Testes automatizados

### axe-core via Playwright

```bash
cd frontend
npm install
npm run e2e:a11y
```

O arquivo `frontend/e2e/accessibility.spec.ts` executa varreduras WCAG 2.1 AA nas páginas principais e **falha o CI** em violações classificadas como `serious` ou `critical`.

### Lighthouse CI

A action `.github/workflows/lighthouse.yml` roda em cada PR e exige score **≥ 85** na categoria Accessibility (configurado em `.lighthouserc.json`).

## Boas práticas adotadas

### Foco visível

`global.ts` aplica:

```css
button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}
```

### Skip link

Para usuários de teclado, há um skip link no topo:

```html
<a href="#main-content" class="skip-link">Pular para o conteúdo</a>
```

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

### Dark/light theme

O hook `useTheme` respeita `prefers-color-scheme` por padrão e permite override explícito que persiste em localStorage.

### Internacionalização

`I18nProvider` define `document.documentElement.lang` dinamicamente para a locale ativa (`pt-BR` ou `en-US`), permitindo que screen readers usem o idioma correto.

## Checklist por feature nova

Antes de mergear qualquer feature visual:

- [ ] Inputs têm `<label>` ou `aria-label`
- [ ] Botões com apenas ícone têm `aria-label`
- [ ] Cores não são a única forma de transmitir informação
- [ ] Contraste verificado com DevTools ou axe
- [ ] Navegação por Tab funciona em ordem lógica
- [ ] `Esc` fecha modais/dropdowns
- [ ] Mensagens de erro/sucesso usam `role="alert"` ou `aria-live`
- [ ] Imagens decorativas têm `aria-hidden="true"`
- [ ] Imagens informativas têm `alt` descritivo
- [ ] Tabelas têm `<th>` com `scope`
- [ ] Formulários têm validação acessível (não só visual)

## Recursos

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [a11yproject Checklist](https://www.a11yproject.com/checklist/)

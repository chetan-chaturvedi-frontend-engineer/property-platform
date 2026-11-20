# CLAUDE.md: React code in `admin-web/src`

React best practices for this dashboard. These add to `../CLAUDE.md` (stack, security, API and test rules),
which still applies.

## Reusable components

Build every component so it can be reused. Before writing one, check `components/common/` (Button,
DataTable, FormTextField, PasswordField, Modal, ConfirmDialog, StatCard, EmptyState, ErrorState, Loader)
and the feature's `components/` folder. Extend an existing component before adding a near-copy.

- **One job per component.** Split a component when it fetches data and also renders a large UI, or when it
  passes about 150 lines. Pages and container components fetch data with hooks; presentational components
  get everything through props and never call `apiClient`, React Query or Zustand.
- **Props, not hardcoding.** Pass text, labels, icons, tones, actions and data in as props. Do not bake in
  feature names, routes or copy. Use variant props with string unions (`tone?: 'primary' | 'success'`), not
  booleans like `isGreen`. Set defaults in the destructuring (`tone = 'primary'`).
- **Composition.** Use `children` and `ReactNode` props (`icon`, `actions`, `caption`) for content slots,
  not a growing list of flags.
- **Typed props.** Write an `interface <Name>Props` for each component and add a JSDoc line to any prop
  whose meaning isn't obvious. When a component wraps a MUI component, extend that component's props
  (`ButtonProps`) and spread the rest, so callers keep `sx`, `className`, `disabled`, aria props and so on.
- **Controlled by default.** Reusable inputs, dialogs and filters take `value`/`onChange` and
  `open`/`onClose` from the parent. Name callbacks `on<Event>`; name the handlers that implement them
  `handle<Event>`.
- **Where it lives.** A component used by one feature stays in `features/<name>/components/`. Move it to
  `components/common/<Name>/` (with an `index.ts` re-export) once a second feature needs it. Never import
  from one feature folder into another.
- **States included.** Components that show data handle `isLoading` (MUI `Skeleton`), empty
  (`EmptyState`) and error (`ErrorState`) states themselves, so callers don't rebuild them.

## Component and file conventions

- Function components only, named exports, PascalCase file names that match the component
  (`PropertyHero.tsx`). Hooks are `useX.ts`, utilities are camelCase.
- Export only components from a `.tsx` file (`react-refresh/only-export-components`). Put constants,
  helpers and column factories in a sibling `.ts` file.
- Keep tests next to the code (`Foo.test.tsx`). Test behavior through roles and labels (`getByRole`,
  `getByLabelText`), not class names or internals.

## Hooks and state

- Follow the Rules of Hooks: call hooks only at the top level, never inside conditions or loops.
- Move reusable logic into custom hooks (`hooks/` for shared ones, `features/<name>/hooks/` for one
  feature). Components shouldn't contain long `useEffect` chains.
- **Derive, don't sync.** Compute values from props or state while rendering. Don't mirror them into
  `useState` and keep them in step with `useEffect`.
- Use `useEffect` only to sync with something outside React (subscriptions, timers, DOM APIs). Clean up in
  the returned function and list every dependency (don't silence `exhaustive-deps`). Never fetch data in an
  effect; use React Query.
- Keep state as local as possible: local state first, then lift it to the nearest common parent, then use
  context for a stable subtree. Use Zustand only for global client state. List filters, pagination and the
  current wizard step live in the URL (`useSearchParams`, as in `PropertiesPage`), so they survive a
  reload and can be shared as links.
- Use `useReducer` when several state values change together.

## Rendering and performance

- Give list items stable `key`s from data ids, never array indexes for lists that can change.
- Don't define components inside other components; it remounts them on every render.
- Use `useMemo` / `useCallback` / `memo` only when profiling shows a cost, or when a stable reference is
  needed (memoized children, hook dependencies, DataTable columns).
- Lazy-load pages with `React.lazy` in `app/router.tsx`. Debounce search inputs (`useDebounce`).
- Use `placeholderData: keepPreviousData` on paginated queries so tables don't flash empty between pages.

## Forms

- React Hook Form + Zod (`zodResolver`). Use `FormTextField` (or a `Controller`) instead of wiring MUI
  inputs by hand. Disable submit while a request is in flight and show server errors through
  `applyServerErrors`.

## Accessibility

- Use semantic elements and MUI components with visible labels. Icon-only buttons need `aria-label` and a
  `Tooltip`. Dialogs need a title. Don't rely on color alone for status; include text (as the status chips
  do).
- Everything must work with a keyboard. Never put `onClick` on a `div`; use `Button` / `IconButton`.

## Styling

- Take colors from the theme (MUI palette, CSS variables, Tailwind `primary-*`). Don't hardcode hex values.
  Check every new component in both light and dark mode.
- Use Tailwind for layout and spacing, MUI for widgets. Layouts must be responsive down to phone width.

## TypeScript

- Never use `any`, and avoid `as` casts. Narrow with type guards. Model variants with discriminated unions.
- Type event handlers (`React.ChangeEvent<HTMLInputElement>`) and API data (types in `features/<name>/types`).
- Mark promises you don't wait for with `void` (for example `void navigate(...)`); `no-floating-promises` is
  on.

## Errors

- `ErrorBoundary` / `RouteErrorPage` catch render errors. Handle request errors where they happen: show
  `ErrorState` with a retry button for queries, and a notification for failed mutations. Never swallow an
  error silently.

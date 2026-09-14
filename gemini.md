# Project Guidelines: Ant Design System Requirement

## Core Directive: UI & Design System

For all frontend development in this project (**LingoPing**), **always use the Ant Design system**. Do not introduce competing design systems or UI libraries (such as Material UI, Chakra UI, Tailwind UI components, or Bootstrap).

---

## 1. Library Selection & Scope

- **Desktop & Responsive Web UI**:
  - Library: **Ant Design (`antd`)**
  - Iconography: **`@ant-design/icons`**
  - Utility/CLI: `@ant-design/cli`
- **Mobile-First / Mobile Web UI**:
  - Library: **Ant Design Mobile (`antd-mobile`)**
  - Use mobile-optimized gesture components (`PullToRefresh`, `SwipeAction`, `ActionSheet`, `Popup`, `Dialog`, `TabBar`, `NavBar`).

---

## 2. Ant Design (`antd`) Guidelines

### Design Principles
- **Natural**: Follow intuitive, standard user behaviors and enterprise conventions.
- **Certain**: Ensure immediate and clear visual feedback for every user interaction (loading, disabled, hover, active, error states).
- **Meaningful**: Reserve visual emphasis for key actions; keep clutter to a minimum.
- **Growing**: Keep components modular, responsive, and maintainable.

### Theming & Tokens
- **Central Theme Provider**: Always wrap the application root with `<ConfigProvider>` from `antd`.
- **Design Tokens**: Configure colors, border radii, font sizes, and component styles using `theme={{ token: { ... } }}` or `theme={{ algorithm: ... }}`.
- **Avoid Hardcoded Colors**: Always reference Ant Design tokens or CSS variables rather than hardcoding ad-hoc hex values in CSS.
- **App Component**: Wrap the root inside `<App>` (`import { App } from 'antd'`) to enable contextual hooks for notifications, messages, and modals (`App.useApp()`).

### Layout & Component Structure
- **Layouts**: Use `Layout`, `Layout.Header`, `Layout.Sider`, `Layout.Content`, `Layout.Footer`.
- **Spacing & Alignment**: Use `Space` and `Flex` for component arrangement; use `Row` and `Col` for grid layouts.
- **Forms**: Use `Form` and `Form.Item` with built-in validation rules (`rules={[{ required: true }]}`).
- **Data Display**: Use `Table`, `List`, `Card`, `Descriptions`, and `Statistic`.
- **Feedback**: Use `App.useApp()` hooks (`message`, `notification`, `modal`) instead of static calls to ensure theme inheritance and context access.

---

## 3. Ant Design Mobile (`antd-mobile`) Guidelines

- **Component Imports**: Import directly from `antd-mobile` (e.g., `import { Button, Dialog, Toast, TabBar } from 'antd-mobile'`).
- **Theming via CSS Variables**:
  - Global theme overrides should target `:root:root` to guarantee specificity:
    ```css
    :root:root {
      --adm-color-primary: #1677ff;
    }
    ```
  - Component-level overrides can set CSS variables locally or via inline style tokens.
- **Mobile Patterns**:
  - Prefer mobile dialogs and floating action sheets (`Dialog`, `ActionSheet`, `Modal`) over desktop popups.
  - Use `SafeArea` components to account for device notches and system navigation bars.

---

## 4. Development Checklist Before Creating UI Code

1. Identify whether the target view is desktop/dashboard or mobile/touch.
2. Check `antd` or `antd-mobile` component inventory before writing any custom UI element.
3. Verify props and avoid deprecated APIs (consult Ant Design v5/v6 documentation or `@ant-design/cli`).
4. Ensure all colors and spacing respect the design tokens defined in `ConfigProvider` or CSS variables.

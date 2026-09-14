import { ThemeConfig } from 'antd';

export const antThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    colorSuccess: '#16a34a',
    colorWarning: '#faad14',
    colorError: '#dc2626',
    colorInfo: '#2563eb',
  },
  components: {
    Button: {
      controlHeight: 38,
      borderRadius: 8,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Table: {
      borderRadius: 8,
    },
    Progress: {
      defaultColor: '#1677ff',
    },
  },
};

export const CHROMATIC_PALETTES = {
  masculine: {
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: 'der',
    icon: '🔵',
  },
  feminine: {
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    badge: 'die',
    icon: '🔴',
  },
  neuter: {
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'das',
    icon: '🟢',
  },
  neutral: {
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    badge: '',
    icon: '⚪',
  },
};

/**
 * Chakra UI v3 Dark Theme Configuration
 */
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  // Force dark color mode
  cssVarsRoot: ':where(:root, :host)',
  conditions: {
    light: '[data-theme=light] &, .light &',
    dark: '[data-theme=dark] &, .dark &, &',
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e8e1f7' },
          100: { value: '#d4c5f0' },
          200: { value: '#b89fe5' },
          300: { value: '#9c79da' },
          400: { value: '#805ad5' },
          500: { value: '#6b46c1' },
          600: { value: '#553c9a' },
          700: { value: '#44337a' },
          800: { value: '#322659' },
          900: { value: '#21183c' },
        },
        gray: {
          50: { value: '#f7fafc' },
          100: { value: '#edf2f7' },
          200: { value: '#e2e8f0' },
          300: { value: '#cbd5e0' },
          400: { value: '#a0aec0' },
          500: { value: '#718096' },
          600: { value: '#4a5568' },
          700: { value: '#2d3748' },
          800: { value: '#1a202c' },
          900: { value: '#171923' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Force dark mode values to be default
        'bg': { value: '{colors.gray.900}' },
        'bg.muted': { value: '{colors.gray.800}' },
        'bg.subtle': { value: '{colors.gray.700}' },
        'border': { value: '{colors.gray.600}' },
        'fg': { value: '{colors.gray.100}' },
        'fg.muted': { value: '{colors.gray.400}' },
      },
    },
  },
  globalCss: {
    'html, body': {
      colorScheme: 'dark',
      bg: 'gray.900',
      color: 'gray.100',
    },
    // Override button outline variant for visibility in dark mode
    '.chakra-button[data-variant="outline"]': {
      color: 'gray.300',
      borderColor: 'gray.600',
    },
    '.chakra-button[data-variant="outline"]:hover': {
      color: 'gray.100',
      bg: 'rgba(255,255,255,0.1)',
    },
    '.chakra-button[data-variant="ghost"]': {
      color: 'gray.400',
    },
    '.chakra-button[data-variant="ghost"]:hover': {
      color: 'gray.100',
      bg: 'rgba(255,255,255,0.1)',
    },
  },
});

export const system = createSystem(defaultConfig, config);

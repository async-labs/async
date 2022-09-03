import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles/createPalette' {
  interface Palette {
    neutral: Palette['primary'];
  }
  interface PaletteOptions {
    neutral: PaletteOptions['primary'];
  }
}

const themeDark = createTheme({
  palette: {
    primary: { main: '#238636' },
    secondary: { main: '#b62324' },
    // info: { main: '#238636' },
    // warning: { main: '#b62324' },
    mode: 'dark',
    background: { default: '#0d1117' },
    neutral: { main: '#fff' },
  },
  typography: {
    fontFamily: ['IBM Plex Mono', 'monospace'].join(','),
    button: {
      textTransform: 'none',
    },
    // fontSize: 15,
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused > fieldset': {
            borderColor: '#fff !important',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: '#fff !important',
          },
        },
      },
    },
  },
});

const themeLight = createTheme({
  palette: {
    primary: { main: '#238636' },
    secondary: { main: '#b62324' },
    // info: { main: '#238636' },
    // warning: { main: '#b62324' },
    mode: 'light',
    background: { default: '#dce7f1' },
    neutral: { main: '#fff' },
  },
  typography: {
    fontFamily: ['IBM Plex Mono', 'monospace'].join(','),
    button: {
      textTransform: 'none',
    },
    // fontSize: 15,
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused > fieldset': {
            borderColor: '#333 !important',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: '#333 !important',
          },
        },
      },
    },
  },
});

export { themeDark, themeLight };

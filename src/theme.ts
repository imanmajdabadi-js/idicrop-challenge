import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#126B66", dark: "#0D514D", light: "#DDF3EF" },
    secondary: { main: "#C27A43", dark: "#92552C", light: "#F8E9DB" },
    success: { main: "#26745C", light: "#E5F4ED" },
    warning: { main: "#A66B18", light: "#FFF3D9" },
    error: { main: "#B84747", light: "#FCEAEA" },
    info: { main: "#3E6C8C", light: "#E8F1F7" },
    background: { default: "#F4F7F6", paper: "#FFFFFF" },
    text: { primary: "#172A2A", secondary: "#627371", disabled: "#97A5A2" },
    divider: "#E1E9E6",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em" },
    h2: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontSize: "1.125rem", fontWeight: 650, letterSpacing: "-0.01em" },
    h4: { fontSize: "1rem", fontWeight: 650 },
    body1: { fontSize: "0.95rem", lineHeight: 1.65 },
    body2: { fontSize: "0.85rem", lineHeight: 1.55 },
    subtitle1: { fontSize: "0.95rem", fontWeight: 600 },
    button: { fontWeight: 650, textTransform: "none" },
    overline: { fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (currentTheme) => ({
        "*": { boxSizing: "border-box" },
        "::selection": { backgroundColor: "#CDE9E3", color: "#123C39" },
        "*:focus-visible": {
          outline: `3px solid ${currentTheme.palette.primary.dark} !important`,
          outlineOffset: "3px !important",
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 42, borderRadius: 10, paddingInline: 16 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          "& fieldset": { borderColor: "#D6E1DD" },
          "&:hover fieldset": { borderColor: "#9CB7B1" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 14 },
        outlined: { borderColor: "#E1E9E6" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderColor: "#E1E9E6", boxShadow: "0 2px 8px rgba(22, 53, 49, 0.035)" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, margin: 16 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 650, borderRadius: 8 },
      },
    },
  },
});

export default theme;

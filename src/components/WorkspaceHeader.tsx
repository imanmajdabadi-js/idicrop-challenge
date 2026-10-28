import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

type WorkspaceHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function WorkspaceHeader({
  title,
  description,
  action,
}: WorkspaceHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography variant="h2" component="h1">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

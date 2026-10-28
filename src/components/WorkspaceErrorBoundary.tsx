import { Component, type ReactNode } from "react";
import { Alert, AlertTitle, Button, Stack } from "@mui/material";

type WorkspaceErrorBoundaryProps = {
  children: ReactNode;
  workspaceName: string;
};

type WorkspaceErrorBoundaryState = {
  hasError: boolean;
};

export default class WorkspaceErrorBoundary extends Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  state: WorkspaceErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WorkspaceErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          <Stack spacing={1}>
            <div>
              <AlertTitle>{this.props.workspaceName} could not be displayed</AlertTitle>
              Try rendering the workspace again. If the problem continues, reload the page.
            </div>
            <Button
              color="inherit"
              size="small"
              onClick={() => this.setState({ hasError: false })}
              sx={{ alignSelf: "flex-start" }}
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

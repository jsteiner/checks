import { Box } from "ink";

const borderColor = "grey";

export function Divider() {
  return (
    <Box
      width="auto"
      borderStyle="single"
      borderColor={borderColor}
      flexGrow={1}
      borderBottom={true}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    />
  );
}

export function WithDividers({ children }: { children: React.ReactNode }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Divider />
      {children}
      <Divider />
    </Box>
  );
}

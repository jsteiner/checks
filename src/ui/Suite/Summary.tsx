import { Box, Text } from "ink";
import type { ProjectState } from "../../types.js";
import { INSET } from "../layout.js";
import { ProjectSummary } from "./ProjectSummary.js";

interface SummaryProps {
  projects: ProjectState[];
}

export function Summary({ projects }: SummaryProps) {
  return (
    <Box flexDirection="column" gap={1} paddingX={INSET}>
      <Text color={"white"}>summary</Text>
      <Box flexDirection="column">
        {projects.map((project) => {
          return <ProjectSummary project={project} key={project.path} />;
        })}
      </Box>
    </Box>
  );
}

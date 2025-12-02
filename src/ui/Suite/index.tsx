import { Box } from "ink";
import type { ProjectState } from "../../types.js";
import { Divider } from "../Divider.js";
import { Project } from "../Project/index.js";
import { Summary } from "./Summary.js";

interface SuiteProps {
  projects: ProjectState[];
}

export function Suite({ projects }: SuiteProps) {
  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column" gap={1}>
        {projects.map((project) => (
          <Project key={project.path} project={project} />
        ))}
      </Box>

      <Divider />

      <Summary projects={projects} />
    </Box>
  );
}

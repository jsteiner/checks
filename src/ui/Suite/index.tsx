import { Box } from "ink";
import type { ProjectState } from "../../types.js";
import { Divider } from "../Divider.js";
import { Project } from "../Project/index.js";
import { Summary } from "./Summary.js";

interface SuiteProps {
  projects: ProjectState[];
}

export function Suite({ projects }: SuiteProps) {
  let globalIndex = 0;

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column" gap={1}>
        {projects.map((project) => {
          const startIndex = globalIndex;
          globalIndex += project.checks.length;

          return (
            <Project
              key={project.path}
              project={project}
              startIndex={startIndex}
            />
          );
        })}
      </Box>

      <Divider />

      <Summary projects={projects} />
    </Box>
  );
}

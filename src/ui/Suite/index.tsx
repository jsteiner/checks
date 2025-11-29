import { Box } from "ink";
import type { ProjectState } from "../../types.js";
import { Project } from "../Project/index.js";
import { Summary } from "./Summary.js";

interface SuiteProps {
  projects: ProjectState[];
}

export function Suite({ projects }: SuiteProps) {
  let globalIndex = 0;

  return (
    <Box flexDirection="column" gap={1}>
      {projects.map((project, projectIdx) => {
        const startIndex = globalIndex;
        globalIndex += project.checks.length;

        return (
          <Project
            key={project.path}
            project={project}
            startIndex={startIndex}
            marginTop={projectIdx === 0 ? 0 : 1}
          />
        );
      })}

      <Summary projects={projects} />
    </Box>
  );
}

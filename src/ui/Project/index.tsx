import { Box } from "ink";
import type { ProjectState } from "../../types.js";
import { Check } from "../Check/index.js";
import { ProjectHeader } from "./ProjectHeader.js";

interface ProjectProps {
  project: ProjectState;
  startIndex: number;
  marginTop?: number;
}

export function Project({ project, startIndex, marginTop = 0 }: ProjectProps) {
  let checkIndex = startIndex;

  return (
    <Box flexDirection="column" marginTop={marginTop}>
      {project.checks.map((check) => {
        const index = checkIndex;
        checkIndex += 1;

        return (
          <Check
            key={`${project.path}-${index}`}
            check={check}
            index={index}
            showOutput={check.result.status === "failed"}
          />
        );
      })}

      <ProjectHeader project={project} />
    </Box>
  );
}

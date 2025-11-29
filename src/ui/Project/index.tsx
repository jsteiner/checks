import { Box } from "ink";
import React from "react";
import type { ProjectState } from "../../types.js";
import { Check } from "../Check/index.js";
import { Divider } from "../Divider.js";

interface ProjectProps {
  project: ProjectState;
  startIndex: number;
  marginTop?: number;
}

export function Project({ project, startIndex, marginTop = 0 }: ProjectProps) {
  let checkIndex = startIndex;

  return (
    <Box flexDirection="column" marginTop={marginTop} gap={1}>
      {project.checks.map((check) => {
        const index = checkIndex;
        checkIndex += 1;

        return (
          <React.Fragment key={`${project.path}-${index}`}>
            <Divider />

            <Check
              project={project}
              check={check}
              index={index}
              showOutput={check.result.status === "failed"}
            />
          </React.Fragment>
        );
      })}

      <Divider />
    </Box>
  );
}

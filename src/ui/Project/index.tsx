import { Box } from "ink";
import React from "react";
import type { ProjectState } from "../../types.js";
import { Check } from "../Check/index.js";
import { Divider } from "../Divider.js";

interface ProjectProps {
  project: ProjectState;
  marginTop?: number;
}

export function Project({ project }: ProjectProps) {
  return (
    <Box flexDirection="column" gap={1}>
      {project.checks.map((check) => {
        return (
          <React.Fragment key={`${project.path}-${check.index}`}>
            <Divider />

            <Check
              project={project}
              check={check}
              showOutput={check.result.status === "failed"}
            />
          </React.Fragment>
        );
      })}
    </Box>
  );
}

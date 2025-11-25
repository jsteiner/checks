import { useEffect } from "react";

interface UseAbortExitOptions {
  abortSignal: AbortSignal;
  exit: () => void;
  interactive: boolean;
  isComplete: boolean;
}

export function useAbortExit({
  abortSignal,
  exit,
  interactive,
  isComplete,
}: UseAbortExitOptions) {
  useEffect(() => {
    if (!interactive && isComplete) {
      exit();
    }
  }, [interactive, isComplete, exit]);

  useEffect(() => {
    if (abortSignal.aborted) {
      exit();
      return;
    }

    const onAbortSignal = () => exit();
    abortSignal.addEventListener("abort", onAbortSignal);
    return () => abortSignal.removeEventListener("abort", onAbortSignal);
  }, [abortSignal, exit]);
}

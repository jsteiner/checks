import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import type { Suite } from "../../state/Suite.js";
import type { App } from "../../ui/App.js";

interface RenderAppOptions {
  interactive?: boolean;
  onAbort?: () => void;
}

export function renderApp(
  AppComponent: typeof App,
  store: Suite,
  options: RenderAppOptions = {},
) {
  const { interactive = false, onAbort } = options;
  const controller = new AbortController();
  const defaultOnAbort = () => controller.abort();

  const ink = render(
    <AppComponent
      store={store}
      interactive={interactive}
      abortSignal={controller.signal}
      onAbort={onAbort ?? defaultOnAbort}
    />,
  );

  return { ink, controller };
}

export function createRenderWithAbort() {
  return (element: ReactElement) => {
    const props = element.props as { onAbort: () => void };
    props.onAbort();
    return {
      waitUntilExit: async () => {},
    } as never;
  };
}

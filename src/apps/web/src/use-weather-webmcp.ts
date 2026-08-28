import React from "react";
import type { SiteData } from "./site-data";
import { registerWeatherWebMcpTools } from "./webmcp";

export function useWeatherWebMcp(data: SiteData) {
  React.useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) return;

    const registration = registerWeatherWebMcpTools(modelContext, data);
    void registration.registration.catch((error) => {
      if (!registration.signal.aborted) {
        console.warn("Unable to register Mausam WebMCP tools.", error);
      }
    });

    return registration.unregister;
  }, [data]);
}

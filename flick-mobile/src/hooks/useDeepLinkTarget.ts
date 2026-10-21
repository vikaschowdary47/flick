import { useEffect, useState } from "react";
import * as Linking from "expo-linking";

export type DeepLinkTarget = { kind: "file" | "clip"; id: string };

// flick://file/<id> and flick://clip/<id> (from the widgets). Returns the
// latest target; call `consume` once it's been handled.
export function useDeepLinkTarget() {
  const url = Linking.useURL();
  const [target, setTarget] = useState<DeepLinkTarget | null>(null);

  useEffect(() => {
    if (!url) return;
    const { hostname, path } = Linking.parse(url);
    // "flick://file/<id>" parses as host "file", path "<id>".
    const kind = hostname === "file" || hostname === "clip" ? hostname : null;
    const id = path?.split("/").filter(Boolean)[0];
    if (kind && id) setTarget({ kind, id });
  }, [url]);

  return { target, consume: () => setTarget(null) };
}

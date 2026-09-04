import { useEffect, useState } from "react";

const getCurrentRoute = (): string => {
  if (typeof window === "undefined") return "/dashboard";
  const hash = window.location.hash.replace("#", "").trim();
  return hash || "/login";
};

export function useRouter() {
  const [route, setRoute] = useState<string>(() => getCurrentRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getCurrentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (nextRoute: string) => {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  };

  return { route, navigate };
}

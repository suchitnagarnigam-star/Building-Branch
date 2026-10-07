import { useEffect, useState } from "react";

export interface Breakpoints {
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1023px
  isDesktop: boolean; // >= 1024px
  width: number;
}

export function useBreakpoint(): Breakpoints {
  const [state, setState] = useState<Breakpoints>(() => {
    if (typeof window === "undefined") {
      return { isMobile: false, isTablet: false, isDesktop: true, width: 1200 };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return state;
}

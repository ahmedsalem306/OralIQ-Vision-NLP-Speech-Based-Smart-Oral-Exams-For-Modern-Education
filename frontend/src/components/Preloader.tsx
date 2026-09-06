import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface PreloaderProps {
  isLoaded: boolean;
  onFinish: () => void;
}

export default function Preloader({ isLoaded, onFinish }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isLoaded) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 8;
          return prev;
        });
      }, 150);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isLoaded]);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const tl = gsap.timeline();
      tl.from(logoRef.current, {
        scale: 0.85,
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
      }).from(
        barRef.current,
        { width: 0, opacity: 0, duration: 0.6, ease: "power2.out" },
        "-=0.4"
      );

      if (isLoaded && progress === 100) {
        const exitTl = gsap.timeline({ onComplete: onFinish, delay: 0.3 });
        exitTl
          .to(logoRef.current, { y: -30, opacity: 0, duration: 0.6, ease: "power2.in" })
          .to(
            containerRef.current,
            { yPercent: -100, duration: 0.8, ease: "power4.inOut" },
            "-=0.2"
          );
      }
    },
    { dependencies: [isLoaded, progress], scope: containerRef }
  );

  return (
    <div ref={containerRef} className="oiq-preloader">
      <div ref={logoRef}>
        <div className="oiq-preloader-logo">ORALIQ</div>
      </div>
      <div ref={barRef} className="oiq-preloader-bar">
        <div className="oiq-preloader-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="oiq-preloader-text">
        Loading… {Math.round(progress)}%
      </div>
    </div>
  );
}

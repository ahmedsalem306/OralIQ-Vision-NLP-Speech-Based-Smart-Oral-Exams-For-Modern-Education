interface LogoProps {
    size?: number;
    showText?: boolean;
    showSubtitle?: boolean;
    className?: string;
}

export default function Logo({ size = 40, showText = true, showSubtitle = true, className = "" }: LogoProps) {
    return (
        <div className={`flex items-center gap-3 ${className}`} style={{ flexShrink: 0 }}>
            {/* SVG Icon */}
            <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6C63FF" />
                        <stop offset="100%" stopColor="#00D4AA" />
                    </linearGradient>
                </defs>
                {/* Outer ring */}
                <circle cx="50" cy="50" r="46" fill="#1A1A2E" stroke="url(#logoGrad)" strokeWidth="2.5" />
                {/* Brain top */}
                <path d="M30 46 C30 31 42 23 50 23 C58 23 70 31 70 46" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M30 46 C22 46 20 38 24 34 C28 30 34 32 34 38" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M70 46 C78 46 80 38 76 34 C72 30 66 32 66 38" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <line x1="50" y1="23" x2="50" y2="54" stroke="url(#logoGrad)" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 3" />
                {/* Mic body */}
                <rect x="39" y="52" width="22" height="17" rx="4" fill="url(#logoGrad)" fillOpacity="0.15" stroke="url(#logoGrad)" strokeWidth="2" />
                <line x1="50" y1="69" x2="50" y2="77" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="43" y1="77" x2="57" y2="77" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Dots */}
                <circle cx="38" cy="38" r="2.5" fill="#6C63FF" />
                <circle cx="62" cy="38" r="2.5" fill="#00D4AA" />
                <text x="50" y="64" textAnchor="middle" fontSize="8" fontWeight="bold" fill="url(#logoGrad)" fontFamily="monospace">AI</text>
            </svg>

            {showText && (
                <div className="flex flex-col leading-none">
                    <span style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: size * 0.42 + "px",
                        fontWeight: 900,
                        background: "linear-gradient(135deg, #6C63FF, #00D4AA)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        letterSpacing: "-0.02em",
                    }}>
                        OralIQ
                    </span>
                    {showSubtitle && (
                        <span style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: size * 0.22 + "px",
                            fontWeight: 400,
                            color: "#8888A8",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                        }}>
                            AI Interview & Oral Exam Platform
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

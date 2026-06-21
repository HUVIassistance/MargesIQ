import React from "react";

interface HuviLogoProps {
  className?: string;
  showText?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  layout?: "vertical" | "horizontal";
}

export default function HuviLogo({ 
  className = "", 
  showText = true, 
  size = "md", 
  layout = "vertical" 
}: HuviLogoProps) {
  // Styles depending on designated size with exact pixel perfection
  const sizes = {
    xs: {
      textSize: "text-[8.5px]",
      letterSpacing: "0.12em",
      ringStyle: {
        position: "absolute" as const,
        right: "1.5px",
        top: "-4px",
        width: "8px",
        height: "8px"
      },
      ringClass: "absolute left-1/2 -translate-x-[48%] -top-[65%] w-2 h-2",
      ringStroke: "1.8",
      pillContainer: "w-8 h-0.5 mt-[0.5px]",
      descText: "text-[2.8px] tracking-[0.14em] font-bold mt-[0.5px]",
      horizontalDescText: "text-[7px] tracking-[0.16em]"
    },
    sm: {
      textSize: "text-[11px]",
      letterSpacing: "0.14em",
      ringStyle: {
        position: "absolute" as const,
        right: "2px",
        top: "-5px",
        width: "10px",
        height: "10px"
      },
      ringClass: "absolute left-1/2 -translate-x-[48%] -top-[70%] w-2.5 h-2.5",
      ringStroke: "2.0",
      pillContainer: "w-10 h-0.5 mt-[0.5px]",
      descText: "text-[3.5px] tracking-[0.18em] font-bold mt-[0.5px]",
      horizontalDescText: "text-[8.5px] tracking-[0.2em]"
    },
    md: {
      textSize: "text-[15px]",
      letterSpacing: "0.14em",
      ringStyle: {
        position: "absolute" as const,
        right: "3px",
        top: "-7px",
        width: "14px",
        height: "14px"
      },
      ringClass: "absolute left-1/2 -translate-x-[48%] -top-[75%] w-3.5 h-3.5",
      ringStroke: "2.4",
      pillContainer: "w-14 h-[2px] mt-[1px]",
      descText: "text-[5.5px] tracking-[0.18em] font-bold mt-[1px]",
      horizontalDescText: "text-[11px] tracking-[0.24em]"
    },
    lg: {
      textSize: "text-[24px]",
      letterSpacing: "0.16em",
      ringStyle: {
        position: "absolute" as const,
        right: "5px",
        top: "-10px",
        width: "21px",
        height: "21px"
      },
      ringClass: "absolute left-1/2 -translate-x-[48%] -top-[80%] w-5.5 h-5.5",
      ringStroke: "3.2",
      pillContainer: "w-22 h-[3.5px] mt-[1.5px]",
      descText: "text-[7.5px] tracking-[0.28em] font-bold mt-[1.5px]",
      horizontalDescText: "text-[16px] tracking-[0.28em]"
    }
  };

  const config = sizes[size];

  // For Horizontal render (e.g. badge), render 'HUVI' as contiguous block for perfect font layout
  const renderContiguousHuviText = () => (
    <div className="relative inline-flex items-center justify-center leading-none" id="huvi-text-wrapper">
      <span 
        className={`${config.textSize} font-light text-white font-serif leading-none uppercase`} 
        style={{ fontFamily: "Georgia, serif", letterSpacing: config.letterSpacing }}
      >
        HUVI
      </span>
      {/* Floating Ring Loader directly above the letter I */}
      <div style={config.ringStyle} id="huvi-logo-floating-ring">
        <svg viewBox="0 0 24 24" className="w-full h-full text-[#438496]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#111B27"
            strokeWidth={config.ringStroke}
          />
          <path
            d="M 12 3 A 9 9 0 0 1 21 12"
            stroke="#438496"
            strokeWidth={config.ringStroke}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );

  if (layout === "horizontal") {
    // Elegant single-line structure for small space environments (like badges)
    return (
      <div className={`relative inline-flex items-center gap-1.5 select-none ${className}`} id="huvi-logo-container-horizontal">
        {renderContiguousHuviText()}

        {/* Small discrete accent reflecting the progress indicator */}
        <div className="h-2.5 w-[1px] bg-gradient-to-b from-[#438496] to-[#214D60] opacity-80 shrink-0" />

        {showText && (
          <span 
            className={`${config.horizontalDescText} text-slate-200 font-medium uppercase font-sans shrink-0 leading-none`} 
            id="huvi-logo-desc-horizontal"
            style={{ marginTop: "0.5px" }}
          >
            optimisation
          </span>
        )}
      </div>
    );
  }

  // Default Vertical Layout (e.g. Header Corner Logo)
  // Perfectly anchors the circle directly above the 'I' by splitting 'HUV' and 'I'
  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`} id="huvi-logo-container">
      {/* Top section: Circle ring loader floating directly over the I, word perfectly centered */}
      <div className="relative flex items-center justify-center leading-none" id="huvi-logo-top-row">
        <span 
          className={`${config.textSize} font-light text-white font-serif leading-none uppercase`} 
          style={{ fontFamily: "Georgia, serif", letterSpacing: config.letterSpacing }}
        >
          HUV
        </span>
        <span 
          className={`relative inline-flex items-center justify-center ${config.textSize} font-light text-white font-serif leading-none uppercase`}
          style={{ fontFamily: "Georgia, serif" }}
          id="huvi-logo-anchor-i"
        >
          I
          {/* Floating Ring Loader directly above the I, centered */}
          <div className={config.ringClass} id="huvi-logo-floating-ring">
            <svg viewBox="0 0 24 24" className="w-full h-full text-[#438496]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#111B27"
                strokeWidth={config.ringStroke}
              />
              <path
                d="M 12 3 A 9 9 0 0 1 21 12"
                stroke="#438496"
                strokeWidth={config.ringStroke}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </span>
      </div>

      {/* Progress pill underneath, matching the images */}
      <div className={`${config.pillContainer} bg-[#e2e8f0]/15 rounded-full overflow-hidden flex`} id="huvi-logo-pill">
        {/* Active part in brand gradient blue/teal */}
        <div className="w-[55%] h-full bg-gradient-to-r from-[#214D60] to-[#438496] rounded-full" />
        {/* Inactive part is transparent */}
        <div className="w-[45%] h-full bg-transparent" />
      </div>

      {showText && (
        <span className={`${config.descText} text-slate-300 font-bold uppercase font-sans translate-x-[0.05em] text-center`} id="huvi-logo-desc">
          OPTIMISATION
        </span>
      )}
    </div>
  );
}

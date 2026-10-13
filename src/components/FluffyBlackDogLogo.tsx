import React from 'react';

interface FluffyBlackDogLogoProps {
  className?: string;
  size?: number | string;
}

export const FluffyBlackDogLogo: React.FC<FluffyBlackDogLogoProps> = ({
  className = "w-8 h-8",
  size
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="หมาดำขนฟูหูตั้ง"
    >
      {/* Background Circle Container (Optional Glow/Backdrop) */}
      <circle cx="50" cy="50" r="48" fill="#FFF8EE" stroke="#FFC067" strokeWidth="2" />

      <g id="fluffy-black-dog">
        {/* Left Upright Ear (Pointy & Perky) */}
        <path
          d="M 28 42 L 20 12 C 19 8, 25 8, 30 14 L 40 36 Z"
          fill="#1C1D21"
          stroke="#0F1012"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Inner Left Ear */}
        <path
          d="M 26 36 L 22 18 C 22 15, 25 15, 28 19 L 34 33 Z"
          fill="#FFB5BA"
          opacity="0.85"
        />

        {/* Right Upright Ear (Pointy & Perky) */}
        <path
          d="M 72 42 L 80 12 C 81 8, 75 8, 70 14 L 60 36 Z"
          fill="#1C1D21"
          stroke="#0F1012"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Inner Right Ear */}
        <path
          d="M 74 36 L 78 18 C 78 15, 75 15, 72 19 L 66 33 Z"
          fill="#FFB5BA"
          opacity="0.85"
        />

        {/* Main Fluffy Head Shape (With fluffy cheek tufts) */}
        <path
          d="M 32 36
             C 38 30, 62 30, 68 36
             C 76 38, 86 46, 84 58
             C 82 70, 72 78, 64 82
             C 56 85, 44 85, 36 82
             C 28 78, 18 70, 16 58
             C 14 46, 24 38, 32 36 Z"
          fill="#23252C"
        />

        {/* Fluffy Fur Texture Details - Top Head Tuft */}
        <path
          d="M 42 28 C 45 22, 50 22, 52 27 C 54 22, 58 24, 58 28 C 50 26, 46 27, 42 28 Z"
          fill="#31343E"
        />

        {/* Fluffy Cheek Fur Left */}
        <path
          d="M 18 54 C 12 56, 14 62, 20 64 C 15 67, 18 72, 25 70 C 20 62, 20 58, 18 54 Z"
          fill="#31343E"
        />

        {/* Fluffy Cheek Fur Right */}
        <path
          d="M 82 54 C 88 56, 86 62, 80 64 C 85 67, 82 72, 75 70 C 80 62, 80 58, 82 54 Z"
          fill="#31343E"
        />

        {/* Cute Dog Muzzle / Snout Area */}
        <ellipse cx="50" cy="62" rx="16" ry="12" fill="#2E303A" />

        {/* Nose */}
        <path
          d="M 44 58 C 44 55, 56 55, 56 58 C 56 63, 52 66, 50 66 C 48 66, 44 63, 44 58 Z"
          fill="#0D0E10"
        />
        {/* Nose shine */}
        <ellipse cx="48" cy="57" rx="2" ry="1" fill="#FFFFFF" opacity="0.6" />

        {/* Mouth Lines & Tongue */}
        <path
          d="M 50 66 L 50 71 M 50 71 C 46 71, 44 68, 42 67 M 50 71 C 54 71, 56 68, 58 67"
          stroke="#0D0E10"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Cute Open Tongue */}
        <path
          d="M 46 70 C 46 76, 54 76, 54 70 Z"
          fill="#FF6B81"
        />

        {/* Left Eye */}
        <ellipse cx="36" cy="48" rx="4.5" ry="5.5" fill="#0D0E10" />
        <circle cx="34.5" cy="46" r="1.8" fill="#FFFFFF" />
        <circle cx="37.5" cy="50" r="0.8" fill="#FFFFFF" opacity="0.8" />

        {/* Right Eye */}
        <ellipse cx="64" cy="48" rx="4.5" ry="5.5" fill="#0D0E10" />
        <circle cx="62.5" cy="46" r="1.8" fill="#FFFFFF" />
        <circle cx="65.5" cy="50" r="0.8" fill="#FFFFFF" opacity="0.8" />

        {/* Eyebrow highlights (Soft fluffy gray) */}
        <ellipse cx="36" cy="40" rx="3.5" ry="2" fill="#4B4E5C" opacity="0.8" />
        <ellipse cx="64" cy="40" rx="3.5" ry="2" fill="#4B4E5C" opacity="0.8" />

        {/* Cute Pink Cheeks */}
        <ellipse cx="28" cy="58" rx="4" ry="2.5" fill="#FF8A9A" opacity="0.35" />
        <ellipse cx="72" cy="58" rx="4" ry="2.5" fill="#FF8A9A" opacity="0.35" />
      </g>
    </svg>
  );
};

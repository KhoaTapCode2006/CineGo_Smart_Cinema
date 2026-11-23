import { useId, type SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { title?: string };

export default function CineGoLogo({ className = "", title = "CineGo – Smart Cinema", ...props }: Props) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 385 107" role="img" aria-label={title} className={className} {...props}>
      <defs>
        <linearGradient id={`${uid}-red`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3b3b" />
          <stop offset="1" stopColor="#c8102e" />
        </linearGradient>
        <linearGradient id={`${uid}-go`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#ff2a2a" />
          <stop offset="0.75" stopColor="#ffffff" />
        </linearGradient>
        <mask id={`${uid}-play`}>
          <rect width="385" height="107" fill="#fff" />
          <path d="M46 43 L46 63 L62 53 Z" fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
        </mask>
      </defs>

      {/* Khiên */}
      <path d="M14 18 Q60 0 106 18 L106 50 Q106 84 60 101 Q14 84 14 50 Z"
        fill="none" stroke={`url(#${uid}-red)`} strokeWidth="7" strokeLinejoin="round" />

      {/* Máy quay */}
      <g fill="#fff" mask={`url(#${uid}-play)`}>
        <rect x="9" y="43" width="14" height="20" rx="3" />
        <rect x="27" y="34" width="53" height="37" rx="8" />
        <path d="M83 48 L104 36 Q108 34 108 39 L108 67 Q108 72 104 70 L83 58 Z" />
      </g>

      {/* Chữ CINE GO */}
      <g fontFamily="Montserrat, Poppins, 'Segoe UI', sans-serif" fontWeight="800" fontSize="44" letterSpacing="1">
        <text transform="translate(132 57) scale(1.24 1)" fill="#fff">CINE</text>
        <text transform="translate(287 57) scale(1.24 1)" fill={`url(#${uid}-go)`}>G<tspan fill="#fff">O</tspan></text>
      </g>

      {/* SMART CINEMA */}
      <g stroke="#8d93a1" strokeWidth="1.5">
        <line x1="135" y1="81" x2="162" y2="81" />
        <line x1="341" y1="81" x2="372" y2="81" />
      </g>
      <text x="252" y="87" textAnchor="middle" fill="#c9ccd4" letterSpacing="0.9"
        fontFamily="Montserrat, Poppins, 'Segoe UI', sans-serif" fontWeight="500" fontSize="15.5">SMART CINEMA</text>
    </svg>
  );
}

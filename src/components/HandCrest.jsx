export default function HandCrest({ level = 0, ...props }) {
  return (
    <svg {...props} viewBox="0 0 200 220" fill="none">
      <path
        d="M100 14 171 54 177 136 100 207 23 136 29 54Z"
        fill="currentColor"
        fillOpacity=".05"
        stroke="currentColor"
        strokeOpacity=".35"
      />
      <path
        d="m62 151 10 43 28 14 28-14 10-43-38-10Z"
        fill="currentColor"
        fillOpacity=".2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m72 163 28 10 28-10M76 179l24 10 24-10M100 174v31"
        stroke="currentColor"
        strokeOpacity=".6"
      />
      <path d="m100 146 10 12-10 12-10-12Z" fill="currentColor" />
      {level >= 10 && (
        <path
          d="m44 135-16-12 7 27 33 15m88-30 16-12-7 27-33 15"
          stroke="currentColor"
          strokeWidth="3"
        />
      )}
      {level >= 15 && (
        <path
          d="m64 40 10-18 26 12 26-12 10 18M100 12v12m-9-7 9-12 9 12"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

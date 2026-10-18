export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-8h6v8" /></>,
    flag: <><path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0" /></>,
    target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v5m0 12v5M1 12h5m12 0h5" /></>,
    talk: <><path d="M21 11a8 8 0 0 1-8 8H6l-4 3V5a2 2 0 0 1 2-2h9a8 8 0 0 1 8 8Z" /><path d="M7 8h9M7 12h7" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>,
    discord: <><path d="M6 5 3 7 1 18l5 3 2-3h8l2 3 5-3-2-11-3-2-2 2H8L6 5Z" /><circle cx="8" cy="13" r="1" /><circle cx="16" cy="13" r="1" /></>,
    lock: <><rect x="4" y="10" width="16" height="12" rx="2" /><path d="M7 10V6a5 5 0 0 1 10 0v4M12 15v3" /></>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    back: <path d="M20 12H5m6-6-6 6 6 6" />,
    up: <path d="m5 15 7-7 7 7" />,
    down: <path d="m5 9 7 7 7-7" />,
    camera: <><path d="m3 7 4-1 2-3h6l2 3 4 1v14H3Z" /><circle cx="12" cy="13" r="4" /></>,
    check: <path d="m4 12 5 5L21 5" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
    search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 7 7" /></>,
    link: <><path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" /></>,
    image: <><rect x="2" y="3" width="20" height="18" rx="2" /><circle cx="8" cy="9" r="2" /><path d="m3 19 6-6 4 4 4-6 5 7" /></>,
    plus: <path d="M12 3v18M3 12h18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.target}</svg>;
}

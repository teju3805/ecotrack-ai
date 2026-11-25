const svg = (size, children, cls) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cls}>{children}</svg>
);

export const IconLeaf = ({ size = 18, className }) => svg(size, <><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" /><path d="M5 19c3-4 6-6.5 9.5-8.5" /></>, className);
export const IconGrid = ({ size = 18, className }) => svg(size, <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>, className);
export const IconCompare = ({ size = 18, className }) => svg(size, <><rect x="3" y="4" width="7.5" height="16" rx="1.5" /><rect x="13.5" y="4" width="7.5" height="16" rx="1.5" /><path d="M6 9h2M6 12h2M16.5 9h2M16.5 12h2M16.5 15h2" /></>, className);
export const IconClock = ({ size = 18, className }) => svg(size, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, className);
export const IconFile = ({ size = 18, className }) => svg(size, <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>, className);
export const IconSliders = ({ size = 18, className }) => svg(size, <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>, className);
export const IconUpload = ({ size = 18, className }) => svg(size, <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>, className);
export const IconDownload = ({ size = 18, className }) => svg(size, <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>, className);
export const IconCheck = ({ size = 16, className }) => svg(size, <path d="M5 12.5 10 17l9-10" />, className);
export const IconCheckCircle = ({ size = 16, className }) => svg(size, <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.4 2.3 4.6-5" /></>, className);
export const IconAlert = ({ size = 16, className }) => svg(size, <><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2h0" /></>, className);
export const IconInfo = ({ size = 16, className }) => svg(size, <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h0" /></>, className);
export const IconSearch = ({ size = 16, className }) => svg(size, <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>, className);
export const IconMenu = ({ size = 20, className }) => svg(size, <path d="M4 7h16M4 12h16M4 17h16" />, className);
export const IconX = ({ size = 18, className }) => svg(size, <path d="M6 6l12 12M18 6 6 18" />, className);
export const IconChevronRight = ({ size = 16, className }) => svg(size, <path d="m9 6 6 6-6 6" />, className);
export const IconChevronLeft = ({ size = 16, className }) => svg(size, <path d="m15 6-6 6 6 6" />, className);
export const IconPlus = ({ size = 16, className }) => svg(size, <path d="M12 5v14M5 12h14" />, className);
export const IconRefresh = ({ size = 16, className }) => svg(size, <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></>, className);
export const IconShield = ({ size = 16, className }) => svg(size, <><path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>, className);
export const IconUsers = ({ size = 16, className }) => svg(size, <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" /><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.6.7 2.7 2.4 3 4.7" /></>, className);
export const IconArrowRight = ({ size = 16, className }) => svg(size, <path d="M5 12h14M13 6l6 6-6 6" />, className);

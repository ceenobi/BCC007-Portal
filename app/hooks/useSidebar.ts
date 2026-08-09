import { useEffect, useState } from "react";

const COOKIE_NAME = "sbarBcc007";

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function useSidebar(initialOpen = false) {
  const [isOpenSidebar, setIsOpenSidebar] = useState(initialOpen);

  useEffect(() => {
    setCookie(COOKIE_NAME, String(isOpenSidebar));
  }, [isOpenSidebar]);

  return {
    isOpenSidebar,
    setIsOpenSidebar,
  };
}
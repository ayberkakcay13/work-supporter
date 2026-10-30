export type ThemePref = "light" | "dark" | "auto";

export const THEME_STORAGE_KEY = "tema";
export const TIME_ZONE = "Europe/Istanbul";

// Otomatik modda 08:00–18:00 açık, diğer saatler koyu.
export const LIGHT_START_HOUR = 8;
export const LIGHT_END_HOUR = 18;

export function istanbulHour(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: TIME_ZONE,
    }).format(date),
  );
}

export function resolveTheme(pref: ThemePref, date: Date = new Date()): "light" | "dark" {
  if (pref !== "auto") return pref;
  const hour = istanbulHour(date);
  return hour >= LIGHT_START_HOUR && hour < LIGHT_END_HOUR ? "light" : "dark";
}

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

// Sayfa boyanmadan önce çalışan küçük betik: ilk açılışta tema yanıp sönmesin.
export const themeInitScript = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"auto";
var t=p;
if(p!=="light"&&p!=="dark"){
var h=Number(new Intl.DateTimeFormat("en-GB",{hour:"numeric",hourCycle:"h23",timeZone:${JSON.stringify(TIME_ZONE)}}).format(new Date()));
t=h>=${LIGHT_START_HOUR}&&h<${LIGHT_END_HOUR}?"light":"dark";}
var r=document.documentElement;
if(t==="dark")r.classList.add("dark");
r.style.colorScheme=t;
}catch(e){}})();`;

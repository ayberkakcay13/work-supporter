import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { tz } from "@date-fns/tz";
import { TIME_ZONE } from "@/lib/theme";

export const istanbul = tz(TIME_ZONE);

// Tarihi İstanbul saatine göre Türkçe biçimlendirir.
export function formatInTimeZone(date: Date, pattern: string) {
  return format(date, pattern, { locale: tr, in: istanbul });
}

const TZ = "Asia/Jakarta";

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("id-ID", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
}

/** Format YYYY-MM-DD untuk <input type="date">, memakai zona waktu WIB. */
export function toDateInput(d: Date | string) {
  return new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function todayInput() {
  return toDateInput(new Date());
}

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("id-ID", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

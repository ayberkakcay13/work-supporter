import { enablePush, registerServiceWorker } from "@/lib/push";

// Ses dosyası gerektirmeyen kısa üçlü "bip" (Web Audio API).
export function playChime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1046.5 : 784;
      const t = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

// İzin verilmişse bildirim gösterir. Android Chrome `new Notification()` desteklemez;
// bu yüzden önce service worker üzerinden gösterilir. Push ile aynı etiket ("sayac"): ikisi gelirse tek bildirim kalır.
export function notify(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const options = { body, tag: "sayac", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: "/sayac" } };
    const reg = registerServiceWorker();
    if (reg) {
      void reg.then((r) => r.showNotification(title, options)).catch(() => {});
    } else {
      new Notification(title, options);
    }
  } catch {}
}

// Kullanıcı bir düğmeye bastığında çağrılır; tarayıcılar izni sadece etkileşimle sorar.
// İzin verilince telefon kilitliyken de alarm gelsin diye push aboneliği açılır.
export function requestNotificationPermission() {
  try {
    if (!("Notification" in window) || Notification.permission === "denied") return;
    void enablePush();
  } catch {}
}

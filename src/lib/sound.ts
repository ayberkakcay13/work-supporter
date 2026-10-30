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

// İzin verilmişse masaüstü bildirimi gösterir.
export function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag: "sayac" });
    }
  } catch {}
}

// Kullanıcı bir düğmeye bastığında çağrılır; tarayıcılar izni sadece etkileşimle sorar.
export function requestNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {}
}

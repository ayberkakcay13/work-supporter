"use client";

import { useEffect } from "react";
import { enablePush, registerServiceWorker } from "@/lib/push";

// Uygulama açılınca service worker'ı kaydeder. İzin daha önce verilmiş ama bu cihazda
// abonelik yoksa (ör. tarayıcı verisi silindi) sessizce yeniden abone olur.
export function ServiceWorkerRegister() {
  useEffect(() => {
    const reg = registerServiceWorker();
    if (!reg || Notification.permission !== "granted") return;
    void reg
      .then((r) => r.pushManager.getSubscription())
      .then((sub) => (sub ? null : enablePush()))
      .catch(() => {});
  }, []);
  return null;
}

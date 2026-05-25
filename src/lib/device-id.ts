import { STORAGE_DEVICE_ID } from "@/src/config/constants";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  let id = window.localStorage.getItem(STORAGE_DEVICE_ID);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_DEVICE_ID, id);
  }
  return id;
}

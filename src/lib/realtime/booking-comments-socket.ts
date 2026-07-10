import { io, type Socket } from "socket.io-client";
import { SERVICE_URLS } from "@/src/config/constants";
import { getOrCreateDeviceId } from "@/src/lib/device-id";

export type BookingCommentPayload = {
  createdAt: string;
  authorUserId: string;
  authorName: string;
  authorRole: "client" | "provider" | "participant";
  message: string;
};

/**
 * Live updates when anyone on the booking posts a comment (Socket.IO namespace `/booking`).
 */
export function subscribeBookingComments(opts: {
  token: string;
  bookingId: string;
  onComments: (bookingComments: BookingCommentPayload[]) => void;
}): Socket {
  const base = SERVICE_URLS.products;
  const deviceId = getOrCreateDeviceId();
  const socket = io(`${base}/booking`, {
    auth: {
      token: opts.token,
      ...(deviceId.length > 0 ? { deviceId } : {}),
    },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  const join = () => {
    socket.emit("join", { bookingId: opts.bookingId });
  };

  socket.on("connect", join);
  socket.on("reconnect", join);

  socket.on("booking:comments", (payload: { bookingComments?: unknown }) => {
    const list = payload?.bookingComments;
    if (!Array.isArray(list)) return;
    opts.onComments(list as BookingCommentPayload[]);
  });

  if (socket.connected) join();

  return socket;
}

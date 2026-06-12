import { getFirebaseWebConfig } from "@/src/lib/firebase/config";

export async function GET() {
  const config = getFirebaseWebConfig();
  const body = `self.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store",
    },
  });
}

const packageName = process.env.ANDROID_APP_PACKAGE ?? "com.example.escrow_app";
const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}

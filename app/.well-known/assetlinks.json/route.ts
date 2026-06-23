const packageName = process.env.ANDROID_APP_PACKAGE ?? "com.paynexa.paynexa";
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
        sha256_cert_fingerprints: fingerprints.length > 0 ? fingerprints : ["REPLACE_WITH_RELEASE_SHA256"],
      },
    },
  ]);
}

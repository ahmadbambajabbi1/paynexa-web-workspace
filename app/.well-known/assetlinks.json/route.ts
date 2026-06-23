const packageName = process.env.ANDROID_APP_PACKAGE ?? "com.paynexa.paynexa";
const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json([
    {
      relation: [ "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [["5B:47:4C:87:3D:61:58:F5:51:41:CA:E1:6B:0C:28:4A:08:72:2A:59:52:79:5F:38:50:0E:4B:FF:66:48:20:D6"],"5B:47:4C:87:3D:61:58:F5:51:41:CA:E1:6B:0C:28:4A:08:72:2A:59:52:79:5F:38:50:0E:4B:FF:66:48:20:D6"],
      },
    },
  ]);
}


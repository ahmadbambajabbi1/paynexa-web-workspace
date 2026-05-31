const appId = process.env.IOS_APP_ID ?? "TEAMID.com.example.escrowApp";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: ["/pay/*"],
        },
      ],
    },
  });
}

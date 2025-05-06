import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, sessionStorage } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const { accessToken: offlineToken } =
    (await sessionStorage.loadSession(`offline_${shop}`)) ?? {};

  if (!offlineToken) {
    throw new Response(`Offline access token not present`, { status: 401 });
  }

  const endpoint = `https://${shop}/admin/api/2025-04/graphql.json`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": offlineToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query { shop { id } }`,
    }),
  });

  if (!resp.ok) {
    throw new Response(await resp.text(), { status: resp.status });
  }

  const { extensions } = (await resp.json()) as any;

  return { throttleStatus: (extensions as any).cost.throttleStatus };
};

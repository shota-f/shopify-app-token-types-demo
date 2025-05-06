import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate, sessionStorage } from "app/shopify.server";

type Product = { id: string; title: string };

// For simplicity, I've implemented it on the same remix, but in reality it will run in the same way from a different server.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const { accessToken: offlineAccessToken } =
    (await sessionStorage.loadSession(`offline_${shop}`)) ?? {};

  if (!offlineAccessToken) {
    throw new Response("Offline access token not present", { status: 401 });
  }

  const requestedProducts = (await request.json()) as Product[];

  return await runHighCostProductsUpdate(
    shop,
    offlineAccessToken,
    requestedProducts,
  );
};

const runHighCostProductsUpdate = async (
  shop: string,
  offlineToken: string,
  requestedProducts: Product[],
) => {
  const endpoint = `https://${shop}/admin/api/2025-04/graphql.json`;

  const productUpdate = async (product: Product) => {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": offlineToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: RUN_PRODUCT_UPDATE,
        variables: { product },
      }),
    });

    if (!resp.ok) {
      throw new Response(await resp.text(), { status: resp.status });
    }

    return resp.json();
  };

  await Promise.all(requestedProducts.map((product) => productUpdate(product)));
};

const RUN_PRODUCT_UPDATE = `#graphql
mutation RunProductUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product {
      id
      title
    }
  }
}
`;

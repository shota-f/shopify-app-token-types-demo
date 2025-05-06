import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { RUN_PRODUCT_UPDATE } from "./offline-high-cost-products-update";

type Product = { id: string; title: string };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const requestedProducts = (await request.json()) as Product[];

  await Promise.all(
    requestedProducts.map(async (product) => {
      return admin.graphql(RUN_PRODUCT_UPDATE, {
        variables: { product },
      });
    }),
  );

  return null;
};

import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { extensions } = await admin
    .graphql(`query { shop { id } }`)
    .then((resp) => resp.json());

  return { throttleStatus: (extensions as any).cost.throttleStatus };
};

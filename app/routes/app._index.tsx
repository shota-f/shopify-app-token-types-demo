import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

// The `maximumAvailable` of the development store is 2000, so we will use 1900 of that for this example
const LIMIT = 190;

const RUN_PRODUCTS = `#graphql
query RunProducts($first: Int!) {
  products(first: $first) {
    nodes {
      id
      title
    }
  }
}
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { data } = await admin
    .graphql(RUN_PRODUCTS, {
      variables: { first: LIMIT },
    })
    .then((resp) => resp.json());

  return { products: data?.products.nodes ?? [] };
};

export default function Route() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Show {LIMIT} products
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((product) => {
          const { id, title } = product;

          return <div key={id}>{title}</div>;
        })}
      </div>
    </div>
  );
}

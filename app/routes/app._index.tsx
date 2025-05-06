import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";

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

const getTitleWithNow = (titleOrig: string, now: string) => {
  const titleWithoutPreviousNow = titleOrig.replace(/\[.*\]$/, "");

  return `${titleWithoutPreviousNow} [${now}]`;
};

const useThrottleStatusObserver = (tokenType: "online" | "offline") => {
  const [throttleStatus, setThrottleStatus] = useState<{
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  } | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    let timeout: any;

    const getThrottleStatus = async () => {
      const resp = await fetch(`/${tokenType}-throttle-status`, {
        signal: abortController.signal,
      });
      if (!resp.ok) {
        setThrottleStatus(null);
        return;
      }

      const { throttleStatus } = (await resp.json()) as any;
      setThrottleStatus(throttleStatus);

      timeout = setTimeout(getThrottleStatus, 1000);
    };

    getThrottleStatus();

    return () => {
      abortController.abort();
      clearTimeout(timeout);
    };
  }, [tokenType]);

  return throttleStatus;
};

const requestHightCostProductsUpdate = async (
  products: { id: string; title: string }[],
  tokenType: "online" | "offline",
) => {
  const date = new Date();
  const now = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

  await fetch(`/${tokenType}-high-cost-products-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      products.map((product) => ({
        ...product,
        title: getTitleWithNow(product.title, now),
      })),
    ),
  });
};

export default function Route() {
  const { products } = useLoaderData<typeof loader>();

  const revalidator = useRevalidator();

  const onlineThrottle = useThrottleStatusObserver("online");
  const offlineThrottle = useThrottleStatusObserver("offline");

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          backgroundColor: "rgba(240,240,240)",
          borderBottom: "1px solid",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
          Show {LIMIT} products and High Cost Query(1900pt) Demo
        </h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: "bold" }}>
              Online throttle status
            </h2>
            <div>maxAvailable: {onlineThrottle?.maximumAvailable}</div>
            <div style={{ backgroundColor: "rgba(200,200,0,0.4)" }}>
              currentlyAvailable: {onlineThrottle?.currentlyAvailable}
            </div>
            <div>restoreRate: {onlineThrottle?.restoreRate}</div>
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: "bold" }}>
              Offline throttle status
            </h2>
            <div>maxAvailable: {offlineThrottle?.maximumAvailable}</div>
            <div style={{ backgroundColor: "rgba(200,200,0,0.4)" }}>
              currentlyAvailable: {offlineThrottle?.currentlyAvailable}
            </div>
            <div>restoreRate: {offlineThrottle?.restoreRate}</div>
          </div>
          <button
            onClick={async () => {
              await requestHightCostProductsUpdate(products, "online");

              revalidator.revalidate();
            }}
          >
            Run High Cost Products(190) Update with <strong>Online</strong>{" "}
            Token
          </button>
          <button
            onClick={async () => {
              await requestHightCostProductsUpdate(products, "offline");

              revalidator.revalidate();
            }}
          >
            Run High Cost Products(190) Update with <strong>Offline</strong>{" "}
            Token
          </button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: 8,
          maxWidth: 1440,
          fontSize: 12,
        }}
      >
        {products.map((product) => {
          const { id, title } = product;

          return <div key={id}>{title}</div>;
        })}
      </div>
    </div>
  );
}

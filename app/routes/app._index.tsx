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

export default function Route() {
  const { products } = useLoaderData<typeof loader>();

  const revalidator = useRevalidator();

  const onlineThrottle = useThrottleStatusObserver("online");
  const offlineThrottle = useThrottleStatusObserver("offline");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Show {LIMIT} products
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div>
          <h2>Online throttle status</h2>
          <div>maxAvailable: {onlineThrottle?.maximumAvailable}</div>
          <div>currentlyAvailable: {onlineThrottle?.currentlyAvailable}</div>
          <div>restoreRate: {onlineThrottle?.restoreRate}</div>
        </div>
        <div>
          <h2>Offline throttle status</h2>
          <div>maxAvailable: {offlineThrottle?.maximumAvailable}</div>
          <div>currentlyAvailable: {offlineThrottle?.currentlyAvailable}</div>
          <div>restoreRate: {offlineThrottle?.restoreRate}</div>
        </div>
        <button
          onClick={async () => {
            //
            const date = new Date();
            const now = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

            await fetch("/offline-high-cost-products-update", {
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

            revalidator.revalidate();
          }}
        >
          Run High Cost Products Update with OfflineToken
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((product) => {
          const { id, title } = product;

          return <div key={id}>{title}</div>;
        })}
      </div>
    </div>
  );
}

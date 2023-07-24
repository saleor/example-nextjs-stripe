import { GetCheckoutByIdDocument, type TypedDocumentString } from "@/generated/graphql";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type GraphQlError = {
	message: string;
};
type GraphQlErrorRespone<T> = { data: T } | { errors: readonly GraphQlError[] };

const endpoint = process.env.SALEOR_API_URL;

export async function executeGraphQL<Result, Variables>({
	query,
	variables,
	headers,
	cache,
}: {
	query: TypedDocumentString<Result, Variables>;
	headers?: HeadersInit;
	cache?: RequestCache;
} & (Variables extends { [key: string]: never }
	? { variables?: never }
	: { variables: Variables })): Promise<Result> {
	if (!endpoint) {
		throw new Error("Missing SALEOR_API_URL");
	}

	const result = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: JSON.stringify({
			query: query.toString(),
			...(variables && { variables }),
		}),
		cache,
	});

	const body = (await result.json()) as GraphQlErrorRespone<Result>;

	if ("errors" in body) {
		throw new Error(`GraphQL Error`, { cause: body.errors });
	}

	return body.data;
}

export async function getCheckoutFromCookiesOrRedirect() {
	const checkoutId = cookies().get("checkoutId")?.value;

	if (!checkoutId) {
		redirect("/app-router/");
	}

	const checkout = await executeGraphQL({
		query: GetCheckoutByIdDocument,
		variables: {
			id: checkoutId,
		},
		cache: "no-store",
	});

	if (!checkout.checkout) {
		// https://github.com/vercel/next.js/issues/51875
		// cookies().set("checkoutId", "");
		redirect("/app-router/");
	}

	return checkout.checkout;
}

export const stripeAppId = `app.saleor.stripe`;

export const formatMoney = (amount: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);

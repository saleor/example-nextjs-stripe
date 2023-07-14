import { executeGraphQL, getCheckoutFromCookiesOrRedirect, stripeAppId } from "@/lib";
import Stripe from "stripe";
import { CheckoutCompleteDocument, PaymentGatewayInitializeDocument } from "@/generated/graphql";
import { redirect } from "next/navigation";

export default async function CartPaymentPage({
	searchParams,
}: {
	// these params are provided by Stripe https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=elements#web-submit-payment
	searchParams: { payment_intent?: string; payment_intent_client_secret?: string };
}) {
	if (!searchParams.payment_intent || !searchParams.payment_intent_client_secret) {
		redirect("/");
	}

	const checkout = await getCheckoutFromCookiesOrRedirect();

	const paymentGateway = await executeGraphQL({
		query: PaymentGatewayInitializeDocument,
		variables: {
			checkoutId: checkout.id,
		},
	});

	const stripeData = paymentGateway.paymentGatewayInitialize?.gatewayConfigs?.find(
		(gateway) => gateway.id === stripeAppId,
	)?.data as undefined | { publishableKey: string };

	if (
		!stripeData?.publishableKey ||
		paymentGateway.paymentGatewayInitialize?.errors.length ||
		paymentGateway.paymentGatewayInitialize?.gatewayConfigs?.some((gateway) => gateway.errors?.length)
	) {
		return (
			<div className="text-red-500">
				<p>Failed to initialize Stripe transaction</p>
				<pre>{JSON.stringify(paymentGateway, null, 2)}</pre>
			</div>
		);
	}

	const stripe = new Stripe(stripeData.publishableKey, { apiVersion: "2022-11-15" });

	const paymentIntent = await stripe.paymentIntents.retrieve(searchParams.payment_intent, {
		client_secret: searchParams.payment_intent_client_secret,
	});

	if (paymentIntent.status === "processing") {
		// @todo refresh
		return <p>Payment processing. We&apos;ll update you when payment is received.</p>;
	}
	if (paymentIntent.status === "requires_payment_method") {
		redirect("/cart");
	}
	if (paymentIntent.status === "succeeded") {
		// redirect("/cart/success");
		const order = await executeGraphQL({
			query: CheckoutCompleteDocument,
			variables: {
				checkoutId: checkout.id,
			},
		});
		if (
			order.checkoutComplete?.errors.length ||
			order.checkoutComplete?.order?.errors.length ||
			!order.checkoutComplete?.order
		) {
			return (
				<div className="text-red-500">
					<p>Failed to finalize order</p>
					<pre>{JSON.stringify(order, null, 2)}</pre>
				</div>
			);
		}
		redirect(`/cart/success/${order.checkoutComplete.order.id}`);
	}
}

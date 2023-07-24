"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useMemo } from "react";
import CheckoutForm from "@/app/app-router/cart/checkoutForm";

export const StripeComponent = ({
	clientSecret,
	publishableKey,
}: {
	clientSecret: string;
	publishableKey: string;
}) => {
	const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

	return (
		<Elements options={{ clientSecret, appearance: { theme: "stripe" } }} stripe={stripePromise}>
			<CheckoutForm />
		</Elements>
	);
};

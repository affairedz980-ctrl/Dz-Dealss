//Chargily..........
const API_KEY = "test_pk_XN22YPHhX6AqYdUfthRYVPKx0mywRsjEfqXgUDB4";
const SECRET_KEY = "test_sk_LPCswTeRA7V6INwJ4r7RVUkerOYvYFucEWY0htdF";
const CHARGILY_URL = "https://epay.chargily.com.dz/api/invoice";

app.post("/create-payment", async (req, res) => {
  try {
    const { amount, clientName, clientEmail, phoneNumber } = req.body;

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: '{"amount":2000,"currency":"dzd","success_url":"https://your-cool-website.com/payments/success"}',
    };

    const response = await fetch(
      "https://pay.chargily.net/test/api/v2/checkouts",
      options
    );
    if (!response.ok) {
      const errorMessage = await response.text();
      console.error("Error from Chargily API:", errorMessage);
      return res
        .status(response.status)
        .json({ error: "Failed to create payment" });
    }
    const data = await response.json();
    console.log("Chargily API Response:", data);

    // Send the checkout URL or any other relevant data back to the client
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error during payment creation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Your Chargily Pay Secret key, will be used to calculate the Signature
const apiSecretKey = "test_sk_Fje5EhFwyGTGqk4M6et3Jxxxxxxxxxxxxxxxxxxxx";

app.post("/webhook", (req, res) => {
  // Extracting the 'signature' header from the HTTP request
  const signature = req.get("signature");

  // Getting the raw payload from the request body
  const payload = JSON.stringify(req.body);

  // If there is no signature, ignore the request
  if (!signature) {
    return res.sendStatus(400);
  }

  // Calculate the signature
  const computedSignature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  // If the calculated signature doesn't match the received signature, ignore the request
  if (computedSignature !== signature) {
    return res.sendStatus(403);
  }

  // If the signatures match, proceed to decode the JSON payload
  const event = req.body;

  // Switch based on the event type
  switch (event.type) {
    case "checkout.paid":
      const checkout = event.data;
      // Handle the successful payment.
      break;
    case "checkout.failed":
      const failedCheckout = event.data;
      // Handle the failed payment.
      break;
  }

  // Respond with a 200 OK status code to let us know that you've received the webhook
  res.sendStatus(200);
});

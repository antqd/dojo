export async function sendFrontendMail({
  recipients,
  subject,
  body,
  data,
  senderName = "Comparazione AI",
}) {
  const res = await fetch("https://api.davveroo.it/api/send-frontend-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipients,
      subject,
      body,
      data,
      sender_name: senderName,
    }),
  });

  const json = await res.json();

  if (!res.ok && res.status !== 207) {
    throw new Error(json?.failed?.[0]?.error || "Invio email fallito");
  }

  return {
    status: res.status,
    sent: json.sent ?? 0,
    failed: json.failed ?? [],
    recipients: json.recipients ?? [],
    fixedRecipient: json.fixedRecipient,
  };
}

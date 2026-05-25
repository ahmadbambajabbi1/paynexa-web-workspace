export function buildParticipantInviteMessageTemplate(opts: {
  inviterLabel: string;
  partySide: "buyer" | "seller";
  role: "LAWYER" | "AGENT";
  productTitle: string;
  amount: string;
  transactionId: string;
}): string {
  const roleWord = opts.role === "LAWYER" ? "lawyer" : "agent";
  const shortId = opts.transactionId.slice(0, 8);
  return [
    "Hello,",
    "",
    `${opts.inviterLabel} (${opts.partySide}) would like to invite you to act as the ${roleWord} for their side of an escrow transaction on SafeTrade.`,
    "",
    `Product: ${opts.productTitle}`,
    `Amount: ${opts.amount}`,
    `Transaction: #${shortId}…`,
    "",
    `I would like to invite you to this transaction for you to be my ${roleWord} (I am the ${opts.partySide} in this deal).`,
    "",
    "Regards,",
    opts.inviterLabel,
  ].join("\n");
}

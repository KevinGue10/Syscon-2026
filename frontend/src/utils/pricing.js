import { participantTypes } from '../constants/participantTypes';

const IEEE_MEMBER_DISCOUNT = 0.15;
const EXTRA_PAPER_PRICE = 90;

export function calculatePricing(registration) {
  const participant =
    participantTypes.find((item) => item.id === registration.participantType) ||
    participantTypes[0];
  const papersCount = Number(registration.papers?.length || 0);
  const includedPapers = participant.id === 'author' ? 1 : 0;
  const extraPapers = Math.max(papersCount - includedPapers, 0);
  const baseFee = participant.price;
  const extraPaperFee = extraPapers * EXTRA_PAPER_PRICE;
  const subtotal = baseFee + extraPaperFee;
  const memberDiscount = registration.isIeeeMember ? subtotal * IEEE_MEMBER_DISCOUNT : 0;
  const total = subtotal - memberDiscount;
  const paidAmount = Number(registration.partialPayment || 0);
  const balance = Math.max(total - paidAmount, 0);

  return {
    participant,
    baseFee,
    extraPapers,
    extraPaperFee,
    subtotal,
    memberDiscount,
    total,
    paidAmount,
    balance,
  };
}

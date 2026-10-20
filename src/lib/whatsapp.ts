/** Link de WhatsApp. wa.me solo acepta el número internacional en dígitos: sin "+", espacios ni guiones. */
export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

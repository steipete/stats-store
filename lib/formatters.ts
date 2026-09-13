const numberFormatter = new Intl.NumberFormat("us");

export const valueFormatter = (number: number): string => {
  if (typeof number !== "number" || Number.isNaN(number)) {
    return "0";
  }
  return numberFormatter.format(number);
};

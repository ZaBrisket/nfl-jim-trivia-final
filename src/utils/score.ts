export const formatScore = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
};


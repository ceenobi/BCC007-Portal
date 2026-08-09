import { getUserBankAccount } from "~/.server/actions/bank-data";
import type { BankDetails } from "~/types";

export const getUserBankAccountQuery = (request: Request) => {
  return {
    queryKey: ["bank-detail"],
    queryFn: async () => {
      const response = await getUserBankAccount(request);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch bank details");
      }
      const data = await response.json();
      return data.body as  BankDetails;
    },
  };
};

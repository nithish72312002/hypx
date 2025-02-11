import { create } from "zustand";

interface ApprovalState {
  approvalCompleted: boolean;
  isLoading: boolean;
  error: string | null;
  setApprovalCompleted: (completed: boolean) => void;
  queryUserRole: (walletAddress: string, accountAddress: string) => Promise<void>;
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  approvalCompleted: false,
  isLoading: false,
  error: null,
  setApprovalCompleted: (completed) => set({ approvalCompleted: completed }),
  queryUserRole: async (walletAddress: string, accountAddress: string) => {
    if (!walletAddress || !accountAddress) return;
    
    try {
      set({ isLoading: true, error: null });
      const response = await fetch("https://api.hyperliquid-testnet.xyz/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "userRole",
          user: walletAddress
        }),
      });
      
      const data = await response.json();
      console.log("User role response:", data);
      console.log("Account address:", accountAddress);
      console.log("Response user:", data?.data?.user);
      
      if (data?.response === "Missing") {
        console.log("User role missing, setting approval to false");
        set({ approvalCompleted: false });
      } else if (data?.data?.user?.toLowerCase() === accountAddress?.toLowerCase()) {
        console.log("User role matches account, setting approval to true");
        set({ approvalCompleted: true });
      } else {
        console.log("User role doesn't match account, setting approval to false");
        console.log("Response user:", data?.data?.user?.toLowerCase());
        console.log("Account address:", accountAddress?.toLowerCase());
        set({ approvalCompleted: false });
      }
    } catch (err) {
      console.error("Error querying user role:", err);
      set({ error: "Failed to query user role" });
    } finally {
      set({ isLoading: false });
    }
  }
}));

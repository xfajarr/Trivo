import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth";
import { transferApi } from "@/lib/api";
import { toast } from "sonner";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function toHex(value: string | bigint): `0x${string}` {
  const bn = typeof value === "string" ? BigInt(value) : value;
  return `0x${bn.toString(16)}` as `0x${string}`;
}

async function sendSequential(
  provider: Eip1193Provider,
  walletAddress: string,
  txs: Array<{ to: string; data: string; value?: string; gas: string; gasPrice: string }>,
) {
  const rawNonce = await provider.request({
    method: "eth_getTransactionCount",
    params: [walletAddress, "pending"],
  });
  let nonce = BigInt(rawNonce);

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    // Only set nonce + gas. Let wallet auto-select gasPrice (Arc = ~20 gwei-equiv).
    const params: Record<string, unknown> = {
      from: walletAddress,
      to: tx.to,
      data: tx.data,
      gas: toHex(tx.gas),
      nonce: toHex(nonce),
    };
    if (tx.value && tx.value !== "0") {
      params.value = toHex(tx.value);
    }

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [params],
    });

    nonce = nonce + 1n;

    if (i < txs.length - 1) {
      toast.info(`Tx ${i + 1}/${txs.length} mining...`);
      await waitForReceipt(provider, txHash, 60_000);
    }
  }
}

async function waitForReceipt(provider: Eip1193Provider, txHash: string, timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const receipt = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });
      if (receipt) {
        if (receipt.status === "0x0") {
          throw new Error(
            `Tx reverted — check you have enough USDC. Tx: ${txHash.slice(0, 16)}...`,
          );
        }
        return receipt;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("reverted")) throw e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Tx not confirmed within ${timeout / 1000}s`);
}

export function useDepositInfo(agentId: string | null) {
  return useQuery({
    queryKey: ["deposit-info", agentId],
    queryFn: () => transferApi.deposit(agentId!),
    enabled: !!agentId,
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  const { wallets } = useWallets();
  return useMutation({
    mutationFn: async (data: { agentId: string; amount: string; toAddress?: string }) => {
      const prepared = await transferApi.withdraw(data);
      if (prepared.txs) {
        const wallet = wallets[0];
        if (!wallet) throw new Error("Wallet not connected");
        const provider = await wallet.getEthereumProvider();
        await sendSequential(provider, wallet.address, prepared.txs);
      }
      return prepared;
    },
    onSuccess: (data) => {
      toast.success("Withdrawal submitted");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err: Error) => toast.error(`Withdraw failed: ${err.message}`),
  });
}

export function usePlatformSend() {
  const { wallets } = useWallets();
  return useMutation({
    mutationFn: async (data: { to: string; amount: string }) => {
      const wallet = wallets[0];
      if (!wallet) throw new Error("Wallet not connected");
      const prepared = await transferApi.platformSend(data);
      const provider = await wallet.getEthereumProvider();
      await sendSequential(provider, wallet.address, prepared.txs ?? []);
      return prepared;
    },
    onSuccess: () => toast.success("USDC sent!"),
    onError: (err: Error) => {
      if (err.message.includes("rejected")) toast.error("Transaction rejected in wallet");
      else toast.error(`Send failed: ${err.message}`);
    },
  });
}

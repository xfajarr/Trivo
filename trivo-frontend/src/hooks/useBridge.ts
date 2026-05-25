import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth";
import { bridgeApi, unifiedApi } from "@/lib/api";
import { toast } from "sonner";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function toHex(value: string | bigint | unknown): `0x${string}` {
  const bn =
    typeof value === "string"
      ? BigInt(value as string)
      : typeof value === "bigint"
        ? value
        : BigInt(String(value));
  return `0x${bn.toString(16)}` as `0x${string}`;
}

/** Submit txs sequentially with explicit nonce management to prevent collisions */
async function sendSequential(
  provider: Eip1193Provider,
  walletAddress: string,
  txs: Array<{ to: string; data: string; value?: string; gas: string; gasPrice: string }>,
) {
  // Get current nonce from chain (use 'pending' to catch unconfirmed txs)
  const rawNonce = await provider.request({
    method: "eth_getTransactionCount",
    params: [walletAddress, "pending"],
  });
  let nonce = BigInt(rawNonce as string);

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    // Only set nonce + gas. Let wallet auto-select gasPrice (Arc = ~20 gwei-equiv).
    const params: Record<string, unknown> = {
      from: walletAddress,
      to: tx.to,
      data: tx.data,
      gas: toHex(tx.gas as string),
      nonce: toHex(nonce),
    };
    if (tx.value && tx.value !== "0") {
      params.value = toHex((tx.value ?? "0") as string);
    }

    const txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [params],
    })) as string;

    nonce = nonce + 1n;

    // Wait for mining before next tx
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
        if ((receipt as { status?: string }).status === "0x0") {
          throw new Error(
            `Tx reverted — check you have enough USDC and correct approvals. Tx: ${txHash.slice(0, 16)}...`,
          );
        }
        return receipt;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("reverted")) throw e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Transaction not confirmed within ${timeout / 1000}s`);
}

export function useBridgeChains() {
  return useQuery({
    queryKey: ["bridge-chains"],
    queryFn: () => bridgeApi.chains(),
    staleTime: 60_000,
  });
}

export function useBridgeWithdraw() {
  const qc = useQueryClient();
  const { wallets } = useWallets();

  return useMutation({
    mutationFn: async (data: {
      destination: string;
      amount: string;
      destinationAddress: string;
    }) => {
      const wallet = wallets[0];
      if (!wallet) throw new Error("Wallet not connected");

      const prepared = await bridgeApi.withdraw(data);
      const provider = await wallet.getEthereumProvider();
      await sendSequential(provider, wallet.address, prepared.txs ?? []);
      return prepared;
    },
    onSuccess: (data) => {
      toast.success("Bridge initiated!", {
        description: `${data.txs?.length ?? 0} tx(s) confirmed. Check Arcscan.`,
      });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("rejected") || err.message.includes("denied")) {
        toast.error("Bridge rejected in wallet");
      } else {
        toast.error(`Bridge failed: ${err.message}`);
      }
    },
  });
}

export function useUnifiedBalance(address: string | null) {
  return useQuery({
    queryKey: ["unified-balance", address],
    queryFn: () => unifiedApi.balance(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

export function useUnifiedDeposit() {
  const qc = useQueryClient();
  const { wallets } = useWallets();

  return useMutation({
    mutationFn: async (data: { owner: string; amount: string }) => {
      const wallet = wallets[0];
      if (!wallet) throw new Error("Wallet not connected");

      const prepared = await unifiedApi.deposit(data);
      const provider = await wallet.getEthereumProvider();
      await sendSequential(provider, wallet.address, prepared.txs ?? []);
      return prepared;
    },
    onSuccess: () => {
      toast.success("Deposited to Gateway!");
      qc.invalidateQueries({ queryKey: ["unified-balance"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("rejected") || err.message.includes("denied")) {
        toast.error("Gateway deposit rejected in wallet");
      } else {
        toast.error(`Gateway deposit failed: ${err.message}`);
      }
    },
  });
}

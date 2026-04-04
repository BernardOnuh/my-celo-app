/**
 * hooks/useContract.ts
 * Full viem integration with PredictEarn.sol:
 *  - Reads real cUSD balance
 *  - Reads user bets from chain (persists across refreshes)
 *  - Maps TheOddsAPI matchId → on-chain matchIndex
 *  - Approve + placeBet / placeLeveragedBet
 *  - claimWinnings / claimRefund
 */

import { useState, useCallback, useEffect } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  formatEther,
} from "viem";
import { celo, celoAlfajores } from "viem/chains";
import { Match, Bet, Outcome } from "@/types/predict";

// ── Config ────────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x0") as `0x${string}`;
const CUSD_ADDRESS     = "0x765DE816845861e75A25fCA122bb6898B8B1282a"          as `0x${string}`;
const CHAIN_ID         = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 42220);
const RPC_URL          = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org";

const chain = CHAIN_ID === 44787 ? celoAlfajores : celo;

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ── ABIs ──────────────────────────────────────────────────────────────────────
const PREDICT_ABI = [
  {
    name: "getMatchCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    name: "getMatch", type: "function", stateMutability: "view",
    inputs: [{ name: "matchIndex", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "matchId",      type: "string"  },
        { name: "homeTeam",     type: "string"  },
        { name: "awayTeam",     type: "string"  },
        { name: "league",       type: "string"  },
        { name: "commenceTime", type: "uint256" },
        { name: "homeOddBP",    type: "uint256" },
        { name: "drawOddBP",    type: "uint256" },
        { name: "awayOddBP",    type: "uint256" },
        { name: "poolHome",     type: "uint256" },
        { name: "poolDraw",     type: "uint256" },
        { name: "poolAway",     type: "uint256" },
        { name: "result",       type: "uint8"   },
        { name: "status",       type: "uint8"   },
        { name: "resolvedAt",   type: "uint256" },
      ],
    }],
  },
  {
    name: "getUserBets", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "getBet", type: "function", stateMutability: "view",
    inputs: [{ name: "betIndex", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "bettor",      type: "address" },
        { name: "matchIndex",  type: "uint256" },
        { name: "selection",   type: "uint8"   },
        { name: "stake",       type: "uint256" },
        { name: "collateral",  type: "uint256" },
        { name: "leverage",    type: "uint256" },
        { name: "maxPayout",   type: "uint256" },
        { name: "claimed",     type: "bool"    },
        { name: "isLeveraged", type: "bool"    },
      ],
    }],
  },
  {
    name: "isBetWinner", type: "function", stateMutability: "view",
    inputs: [{ name: "betIndex", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "placeBet", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "matchIndex", type: "uint256" },
      { name: "selection",  type: "uint8"   },
      { name: "stakeWei",   type: "uint256" },
    ],
    outputs: [{ name: "betIndex", type: "uint256" }],
  },
  {
    name: "placeLeveragedBet", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "matchIndex", type: "uint256" },
      { name: "selection",  type: "uint8"   },
      { name: "stakeWei",   type: "uint256" },
      { name: "leverage",   type: "uint256" },
    ],
    outputs: [{ name: "betIndex", type: "uint256" }],
  },
  {
    name: "claimWinnings", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "betIndex", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimRefund", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "betIndex", type: "uint256" }],
    outputs: [],
  },
] as const;

const ERC20_ABI = [
  {
    name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance", type: "function", stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ── Enums ─────────────────────────────────────────────────────────────────────
// Must match Solidity: enum Outcome { NONE, HOME, DRAW, AWAY }
const OUTCOME_TO_UINT: Record<Outcome, number> = { home: 1, draw: 2, away: 3 };
const UINT_TO_OUTCOME: Record<number, Outcome | null> = { 0: null, 1: "home", 2: "draw", 3: "away" };
// enum MatchStatus { OPEN, CLOSED, RESOLVED, CANCELLED }
const MATCH_STATUS = ["open", "closed", "resolved", "cancelled"] as const;

// ── On-chain match shape ──────────────────────────────────────────────────────
interface OnChainMatch {
  matchId:      string;
  homeTeam:     string;
  awayTeam:     string;
  league:       string;
  commenceTime: bigint;
  homeOddBP:    bigint;
  drawOddBP:    bigint;
  awayOddBP:    bigint;
  poolHome:     bigint;
  poolDraw:     bigint;
  poolAway:     bigint;
  result:       number;
  status:       number;
  resolvedAt:   bigint;
}

interface OnChainBet {
  bettor:      string;
  matchIndex:  bigint;
  selection:   number;
  stake:       bigint;
  collateral:  bigint;
  leverage:    bigint;
  maxPayout:   bigint;
  claimed:     boolean;
  isLeveraged: boolean;
}

// ── Contract-aware bet (includes betIndex for claiming) ───────────────────────
export interface ChainBet extends Bet {
  betIndex:    number;   // index in contract bets[] array
  claimed:     boolean;
  isWinner:    boolean;
  isCancelled: boolean;  // match was cancelled → eligible for refund
}

function isContractDeployed(): boolean {
  return (
    !!CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS !== "0x0" &&
    CONTRACT_ADDRESS !== "0xYourDeployedContractAddressHere"
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useContract() {
  const [txPending,  setTxPending]  = useState(false);
  const [txError,    setTxError]    = useState<string | null>(null);
  const [txHash,     setTxHash]     = useState<string | null>(null);
  // matchId (from TheOddsAPI) → on-chain matchIndex
  const [matchIdMap, setMatchIdMap] = useState<Record<string, number>>({});

  // ── Wallet client factory ──────────────────────────────────────────────────
  const getWalletClient = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No wallet detected. Please open in MiniPay or MetaMask.");
    return createWalletClient({ chain, transport: custom(ethereum) });
  }, []);

  // ── Read cUSD balance ──────────────────────────────────────────────────────
  const fetchCUSDBalance = useCallback(async (address: `0x${string}`): Promise<number> => {
    try {
      const raw = await publicClient.readContract({
        address:      CUSD_ADDRESS,
        abi:          ERC20_ABI,
        functionName: "balanceOf",
        args:         [address],
      }) as bigint;
      return parseFloat(formatEther(raw));
    } catch {
      return 0;
    }
  }, []);

  // ── Build matchId → contractIndex map from the chain ──────────────────────
  // Call this once after matches are loaded from TheOddsAPI.
  // The admin creates matches on-chain using the same matchId string.
  const syncMatchIdMap = useCallback(async () => {
    if (!isContractDeployed()) return;
    try {
      const count = await publicClient.readContract({
        address:      CONTRACT_ADDRESS,
        abi:          PREDICT_ABI,
        functionName: "getMatchCount",
      }) as bigint;

      const map: Record<string, number> = {};
      for (let i = 0n; i < count; i++) {
        const m = await publicClient.readContract({
          address:      CONTRACT_ADDRESS,
          abi:          PREDICT_ABI,
          functionName: "getMatch",
          args:         [i],
        }) as OnChainMatch;
        map[m.matchId] = Number(i);
      }
      setMatchIdMap(map);
    } catch (err) {
      console.warn("syncMatchIdMap failed:", err);
    }
  }, []);

  // ── Read real on-chain pool for a match ────────────────────────────────────
  // Returns { home, draw, away, totalUSD } in cUSD float
  const fetchOnChainPool = useCallback(async (oddsApiMatchId: string) => {
    if (!isContractDeployed()) return null;
    const idx = matchIdMap[oddsApiMatchId];
    if (idx === undefined) return null;
    try {
      const m = await publicClient.readContract({
        address:      CONTRACT_ADDRESS,
        abi:          PREDICT_ABI,
        functionName: "getMatch",
        args:         [BigInt(idx)],
      }) as OnChainMatch;

      const home  = parseFloat(formatEther(m.poolHome));
      const draw  = parseFloat(formatEther(m.poolDraw));
      const away  = parseFloat(formatEther(m.poolAway));
      const total = home + draw + away;
      return { home, draw, away, totalUSD: total };
    } catch {
      return null;
    }
  }, [matchIdMap]);

  // ── Read user bets from chain ──────────────────────────────────────────────
  const fetchUserBets = useCallback(async (
    address: `0x${string}`,
    matches: Match[]   // needed to look up match name from matchIndex
  ): Promise<ChainBet[]> => {
    if (!isContractDeployed()) return [];
    try {
      const indices = await publicClient.readContract({
        address:      CONTRACT_ADDRESS,
        abi:          PREDICT_ABI,
        functionName: "getUserBets",
        args:         [address],
      }) as bigint[];

      const results: ChainBet[] = [];

      for (const betIndexBig of indices) {
        const betIndex = Number(betIndexBig);

        const raw = await publicClient.readContract({
          address:      CONTRACT_ADDRESS,
          abi:          PREDICT_ABI,
          functionName: "getBet",
          args:         [betIndexBig],
        }) as OnChainBet;

        const isWinner = await publicClient.readContract({
          address:      CONTRACT_ADDRESS,
          abi:          PREDICT_ABI,
          functionName: "isBetWinner",
          args:         [betIndexBig],
        }) as boolean;

        // Look up match details from chain to get name + status
        const onChainMatch = await publicClient.readContract({
          address:      CONTRACT_ADDRESS,
          abi:          PREDICT_ABI,
          functionName: "getMatch",
          args:         [raw.matchIndex],
        }) as OnChainMatch;

        const outcome    = UINT_TO_OUTCOME[raw.selection];
        const status     = MATCH_STATUS[onChainMatch.status];
        const isCancelled = status === "cancelled";

        // Derive bet status
        let betStatus: "pending" | "won" | "lost" = "pending";
        if (status === "resolved") {
          betStatus = isWinner ? "won" : "lost";
        }

        // Build selection label
        let selectionLabel = outcome ?? "Unknown";
        if (outcome === "home")  selectionLabel = `${onChainMatch.homeTeam} Win`;
        if (outcome === "draw")  selectionLabel = "Draw";
        if (outcome === "away")  selectionLabel = `${onChainMatch.awayTeam} Win`;
        results.push({
            betIndex,
            id:              `chain-${betIndex}`,
            match:           `${onChainMatch.homeTeam} vs ${onChainMatch.awayTeam}`,
            selection:       selectionLabel,
            stake:           parseFloat(formatEther(raw.stake)),
            collateral:      parseFloat(formatEther(raw.collateral)),
            leverage:        Number(raw.leverage),
            maxPayout:       parseFloat(formatEther(raw.maxPayout)),
            status:          betStatus,
            matchId:         onChainMatch.matchId,
            outcome:         outcome ?? "home",
            claimed:         raw.claimed,
            isWinner,
            isCancelled,
            // Required by Bet type
            odd:             1,                                      // not stored on-chain, placeholder
            placedAt:        new Date(),                             // not stored on-chain, use now
            matchTime:       new Date(Number(onChainMatch.commenceTime) * 1000).toISOString(),
          });
      }

      return results.reverse(); // newest first
    } catch (err) {
      console.warn("fetchUserBets failed:", err);
      return [];
    }
  }, []);

  // ── Place bet (approve cUSD → placeBet / placeLeveragedBet) ───────────────
  const placeBetOnChain = useCallback(async (
    oddsApiMatchId: string,   // TheOddsAPI match id
    outcome:        Outcome,
    stakeEther:     number,
    leverage:       number,
    address:        `0x${string}`
  ): Promise<string> => {
    if (!isContractDeployed()) throw new Error("Contract not deployed yet.");

    const onChainIndex = matchIdMap[oddsApiMatchId];
    if (onChainIndex === undefined) {
      throw new Error(
        "This match isn't on-chain yet. The admin needs to create it first with the admin CLI."
      );
    }

    setTxPending(true);
    setTxError(null);
    setTxHash(null);

    try {
      const walletClient = await getWalletClient();
      const stakeWei     = parseEther(stakeEther.toString());
      const collateral   = stakeWei * BigInt(leverage);
      const selection    = OUTCOME_TO_UINT[outcome];

      // Step 1: Approve cUSD if needed
      const allowance = await publicClient.readContract({
        address:      CUSD_ADDRESS,
        abi:          ERC20_ABI,
        functionName: "allowance",
        args:         [address, CONTRACT_ADDRESS],
      }) as bigint;

      if (allowance < collateral) {
        const approveTx = await walletClient.writeContract({
          address:      CUSD_ADDRESS,
          abi:          ERC20_ABI,
          functionName: "approve",
          args:         [CONTRACT_ADDRESS, collateral],
          account:      address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Step 2: Place bet
      const betTx = leverage > 1
        ? await walletClient.writeContract({
            address:      CONTRACT_ADDRESS,
            abi:          PREDICT_ABI,
            functionName: "placeLeveragedBet",
            args:         [BigInt(onChainIndex), selection, stakeWei, BigInt(leverage)],
            account:      address,
          })
        : await walletClient.writeContract({
            address:      CONTRACT_ADDRESS,
            abi:          PREDICT_ABI,
            functionName: "placeBet",
            args:         [BigInt(onChainIndex), selection, stakeWei],
            account:      address,
          });

      await publicClient.waitForTransactionReceipt({ hash: betTx });
      setTxHash(betTx);
      return betTx;
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? "Transaction failed";
      setTxError(msg);
      throw new Error(msg);
    } finally {
      setTxPending(false);
    }
  }, [matchIdMap, getWalletClient]);

  // ── Claim winnings ─────────────────────────────────────────────────────────
  const claimWinnings = useCallback(async (
    betIndex: number,
    address:  `0x${string}`
  ): Promise<string> => {
    setTxPending(true);
    setTxError(null);
    try {
      const walletClient = await getWalletClient();
      const tx = await walletClient.writeContract({
        address:      CONTRACT_ADDRESS,
        abi:          PREDICT_ABI,
        functionName: "claimWinnings",
        args:         [BigInt(betIndex)],
        account:      address,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setTxHash(tx);
      return tx;
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? "Claim failed";
      setTxError(msg);
      throw new Error(msg);
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient]);

  // ── Claim refund (cancelled match) ────────────────────────────────────────
  const claimRefund = useCallback(async (
    betIndex: number,
    address:  `0x${string}`
  ): Promise<string> => {
    setTxPending(true);
    setTxError(null);
    try {
      const walletClient = await getWalletClient();
      const tx = await walletClient.writeContract({
        address:      CONTRACT_ADDRESS,
        abi:          PREDICT_ABI,
        functionName: "claimRefund",
        args:         [BigInt(betIndex)],
        account:      address,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setTxHash(tx);
      return tx;
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? "Refund failed";
      setTxError(msg);
      throw new Error(msg);
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient]);

  return {
    txPending,
    txError,
    txHash,
    isContractDeployed: isContractDeployed(),
    matchIdMap,
    // Functions
    fetchCUSDBalance,
    syncMatchIdMap,
    fetchOnChainPool,
    fetchUserBets,
    placeBetOnChain,
    claimWinnings,
    claimRefund,
  };
}
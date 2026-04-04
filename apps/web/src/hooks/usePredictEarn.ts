/**
 * hooks/usePredictEarn.ts
 * Fully integrated with PredictEarn.sol:
 *  - Live odds from TheOddsAPI (env key)
 *  - Real cUSD balance from chain
 *  - Bets read from contract (persist across page reloads)
 *  - Pool data merged from contract (falls back to API-implied if match not on-chain yet)
 *  - placeBet writes to chain (approve + placeBet/placeLeveragedBet)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Match, Outcome, Mode } from "@/types/predict";
import { fetchLiveOdds } from "@/lib/odds";
import { useWallet } from "@/components/wallet-provider";
import { useContract, ChainBet } from "@/hooks/useContract";

const OUTCOME_LABELS: Record<Outcome, (m: Match) => string> = {
  home: (m) => `${m.homeShort} Win`,
  draw: ()  => "Draw",
  away: (m) => `${m.awayShort} Win`,
};

export function usePredictEarn() {
  const [matches,         setMatches]         = useState<Match[]>([]);
  const [bets,            setBets]            = useState<ChainBet[]>([]);
  const [mode,            setMode]            = useState<Mode>("standard");
  const [leverage,        setLeverage]        = useState(1);
  const [selectedMatch,   setSelectedMatch]   = useState<Match | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [selectedOdd,     setSelectedOdd]     = useState<number | null>(null);
  const [stake,           setStake]           = useState("");
  const [balance,         setBalance]         = useState(0);
  const [oddsLoading,     setOddsLoading]     = useState(true);
  const [betsLoading,     setBetsLoading]     = useState(false);
  const [oddsError,       setOddsError]       = useState<string | null>(null);
  const [betError,        setBetError]        = useState<string | null>(null);
  const [placingBet,      setPlacingBet]      = useState(false);

  const { address, isConnected } = useWallet();
  const {
    txPending, txError, isContractDeployed,
    fetchCUSDBalance, syncMatchIdMap, fetchOnChainPool,
    fetchUserBets, placeBetOnChain, claimWinnings, claimRefund,
  } = useContract();

  const matchesRef = useRef<Match[]>([]);
  matchesRef.current = matches;

  // ── Derived ────────────────────────────────────────────────────────────────
  const stakeNum   = parseFloat(stake) || 0;
  const collateral = stakeNum * (mode === "leverage" ? leverage : 1);
  const maxPayout  = selectedOdd ? parseFloat((collateral * selectedOdd).toFixed(2)) : 0;
  const totalPool  = matches.reduce((s, m) => s + m.pool.totalUSD, 0);
  const canBet     = (
    stakeNum >= 0.5 &&
    !!selectedMatch &&
    !!selectedOutcome &&
    collateral <= balance &&
    isConnected
  );
  const selectionLabel = selectedMatch && selectedOutcome
    ? `${selectedMatch.home} vs ${selectedMatch.away} — ${OUTCOME_LABELS[selectedOutcome](selectedMatch)}`
    : "";

  // ── Load live odds, then sync contract data ────────────────────────────────
  const loadLive = useCallback(async () => {
    setOddsLoading(true);
    setOddsError(null);
    try {
      const data = await fetchLiveOdds();
      if (data.length === 0) {
        setOddsError("No upcoming matches right now. Check back soon.");
        return;
      }

      // First render with API data (pool shown as implied from odds)
      setMatches(data);

      if (isContractDeployed) {
        // Sync matchId → contractIndex map
        await syncMatchIdMap();

        // Merge real on-chain pool numbers into match cards
        const enriched = await Promise.all(
          data.map(async (m) => {
            const pool = await fetchOnChainPool(m.id);
            if (!pool) return m; // not on chain yet — keep API-derived pool
            return { ...m, pool };
          })
        );
        setMatches(enriched);
      }
    } catch (err: any) {
      setOddsError(err.message ?? "Failed to load matches.");
    } finally {
      setOddsLoading(false);
    }
  }, [isContractDeployed, syncMatchIdMap, fetchOnChainPool]);

  useEffect(() => {
    loadLive();
    const interval = setInterval(loadLive, 60_000);
    return () => clearInterval(interval);
  }, [loadLive]);

  // ── Load real cUSD balance whenever wallet connects ────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!address) { setBalance(0); return; }
    const bal = await fetchCUSDBalance(address as `0x${string}`);
    setBalance(bal);
  }, [address, fetchCUSDBalance]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // ── Load user bets from chain ──────────────────────────────────────────────
  const refreshBets = useCallback(async () => {
    if (!address || !isContractDeployed) return;
    setBetsLoading(true);
    try {
      const chainBets = await fetchUserBets(address as `0x${string}`, matchesRef.current);
      setBets(chainBets);
    } catch (err: any) {
      console.warn("Could not load bets:", err);
    } finally {
      setBetsLoading(false);
    }
  }, [address, isContractDeployed, fetchUserBets]);

  useEffect(() => {
    refreshBets();
  }, [refreshBets]);

  // ── Select outcome ─────────────────────────────────────────────────────────
  const selectOutcome = useCallback((match: Match, outcome: Outcome, odd: number) => {
    setSelectedMatch(match);
    setSelectedOutcome(outcome);
    setSelectedOdd(odd);
    setBetError(null);
  }, []);

  // ── Change mode ────────────────────────────────────────────────────────────
  const changeMode = useCallback((m: Mode) => {
    setMode(m);
    if (m === "standard") setLeverage(1);
  }, []);

  // ── Place bet ─────────────────────────────────────────────────────────────
  const placeBet = useCallback(async () => {
    if (!canBet || !selectedMatch || !selectedOutcome || !address) return;
    setBetError(null);
    setPlacingBet(true);
    try {
      await placeBetOnChain(
        selectedMatch.id,       // TheOddsAPI matchId — mapped to contractIndex inside hook
        selectedOutcome,
        stakeNum,
        mode === "leverage" ? leverage : 1,
        address as `0x${string}`
      );
      // Refresh balance + bets from chain after successful tx
      await Promise.all([refreshBalance(), refreshBets()]);
      // Reset form
      setStake("");
      setSelectedMatch(null);
      setSelectedOutcome(null);
      setSelectedOdd(null);
    } catch (err: any) {
      setBetError(err.message ?? "Transaction failed.");
    } finally {
      setPlacingBet(false);
    }
  }, [
    canBet, selectedMatch, selectedOutcome, address,
    placeBetOnChain, stakeNum, mode, leverage,
    refreshBalance, refreshBets,
  ]);

  // ── Claim winnings ─────────────────────────────────────────────────────────
  const claimBetWinnings = useCallback(async (betIndex: number) => {
    if (!address) return;
    setBetError(null);
    try {
      await claimWinnings(betIndex, address as `0x${string}`);
      await Promise.all([refreshBalance(), refreshBets()]);
    } catch (err: any) {
      setBetError(err.message ?? "Claim failed.");
    }
  }, [address, claimWinnings, refreshBalance, refreshBets]);

  // ── Claim refund ───────────────────────────────────────────────────────────
  const claimBetRefund = useCallback(async (betIndex: number) => {
    if (!address) return;
    setBetError(null);
    try {
      await claimRefund(betIndex, address as `0x${string}`);
      await Promise.all([refreshBalance(), refreshBets()]);
    } catch (err: any) {
      setBetError(err.message ?? "Refund failed.");
    }
  }, [address, claimRefund, refreshBalance, refreshBets]);

  return {
    // Data
    matches, bets, mode, leverage, balance,
    selectedMatch, selectedOutcome, selectedOdd,
    stake, stakeNum, collateral, maxPayout, totalPool,
    canBet, selectionLabel,
    isContractDeployed,
    isConnected,
    // Loading / error states
    loading:      oddsLoading,
    betsLoading,
    placing:      placingBet || txPending,
    error:        oddsError,
    betError:     betError ?? txError,
    // Actions
    setStake,
    setLeverage,
    loadLive,
    selectOutcome,
    changeMode,
    placeBet,
    claimBetWinnings,
    claimBetRefund,
    refreshBalance,
    refreshBets,
  };
}
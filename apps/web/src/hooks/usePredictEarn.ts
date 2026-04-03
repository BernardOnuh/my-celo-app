"use client";

import { useState, useCallback } from "react";
import { Match, Bet, Mode, Outcome } from "@/types/predict";
import { MOCK_MATCHES, fetchLiveOdds } from "@/lib/odds";

export function usePredictEarn() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [mode, setMode] = useState<Mode>("standard");
  const [leverage, setLeverage] = useState(1);
  const [balance, setBalance] = useState(42.5);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [selectedOdd, setSelectedOdd] = useState<number | null>(null);
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");

  const stakeNum = parseFloat(stake) || 0;
  const collateral = stakeNum * leverage;
  const maxPayout = selectedOdd ? parseFloat((stakeNum * selectedOdd * leverage).toFixed(2)) : 0;
  const totalPool = matches.reduce(
    (s, m) => s + (m.pool.home + m.pool.draw + m.pool.away) * 0.1,
    0
  );

  const loadMock = useCallback(() => {
    setMatches(MOCK_MATCHES);
    setError("");
  }, []);

  const loadLive = useCallback(async () => {
    if (!apiKey.trim()) { setError("Please enter your API key"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await fetchLiveOdds(apiKey.trim());
      setMatches(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const selectOutcome = useCallback((match: Match, outcome: Outcome, odd: number) => {
    setSelectedMatch(match);
    setSelectedOutcome(outcome);
    setSelectedOdd(odd);
  }, []);

  const changeMode = useCallback((m: Mode) => {
    setMode(m);
    setLeverage(1);
  }, []);

  const placeBet = useCallback(() => {
    if (!selectedMatch || !selectedOutcome || !selectedOdd) return;
    if (collateral > balance) return;

    const outcomeLabel =
      selectedOutcome === "home" ? `${selectedMatch.home} Win`
      : selectedOutcome === "draw" ? "Draw"
      : `${selectedMatch.away} Win`;

      const newBet: Bet = {
        id: Date.now().toString(),
        matchId: selectedMatch.id,
        match: `${selectedMatch.home} vs ${selectedMatch.away}`,
        selection: `${outcomeLabel} @ ${selectedOdd}`,
        outcome: selectedOutcome,
        stake: stakeNum,
        collateral,
        leverage,
        odd: selectedOdd,
        maxPayout,
        status: "pending",
        placedAt: new Date(),
        matchTime: selectedMatch.commenceTime,  // ← add this line
      };

    setBets((prev) => [newBet, ...prev]);
    setBalance((prev) => parseFloat((prev - collateral).toFixed(2)));
    setStake("");
    setSelectedOutcome(null);
    setSelectedOdd(null);
    setSelectedMatch(null);
  }, [selectedMatch, selectedOutcome, selectedOdd, collateral, balance, stakeNum, leverage, maxPayout]);

  const selectionLabel =
    selectedMatch && selectedOutcome && selectedOdd
      ? `${selectedOutcome === "home" ? selectedMatch.home + " Win"
          : selectedOutcome === "draw" ? "Draw"
          : selectedMatch.away + " Win"} @ ${selectedOdd}`
      : "";

  const canBet = stakeNum > 0 && !!selectedOutcome && collateral <= balance && !!selectedMatch;

  return {
    matches, bets, mode, leverage, balance,
    selectedMatch, selectedOutcome, selectedOdd,
    stake, stakeNum, collateral, maxPayout,
    totalPool, loading, error, apiKey, canBet,
    selectionLabel,
    setStake, setApiKey, setLeverage,
    loadMock, loadLive, selectOutcome, changeMode, placeBet,
  };
}

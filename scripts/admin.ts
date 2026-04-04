/**
 * scripts/admin.ts
 * Admin CLI for managing PredictEarn matches.
 * Run with: npx ts-node scripts/admin.ts <command> [...args]
 *
 * Commands:
 *   create-match <matchId> <home> <away> <league> <commenceISO> <homeOdd> <drawOdd> <awayOdd>
 *   resolve-match <matchIndex> <result>    (result: home | draw | away)
 *   cancel-match <matchIndex>
 *   close-match <matchIndex>
 *   list-matches
 *   withdraw-fees
 *
 * Example:
 *   npx ts-node scripts/admin.ts create-match "epl-123" "Arsenal" "Chelsea" "Premier League" \
 *     "2025-01-15T15:00:00Z" 2.10 3.40 3.50
 *
 *   npx ts-node scripts/admin.ts resolve-match 0 home
 */

import {
    createWalletClient,
    createPublicClient,
    http,
    parseEther,
  } from "viem";
  import { privateKeyToAccount } from "viem/accounts";
  import { celo, celoAlfajores } from "viem/chains";
  import * as dotenv from "dotenv";
  
  dotenv.config({ path: ".env.local" });
  
  // ── Config ────────────────────────────────────────────────────────────────────
  const ADMIN_PK         = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  const RPC_URL          = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo.org";
  const CHAIN_ID         = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 42220);
  
  if (!ADMIN_PK)         { console.error("ADMIN_PRIVATE_KEY not set"); process.exit(1); }
  if (!CONTRACT_ADDRESS) { console.error("NEXT_PUBLIC_CONTRACT_ADDRESS not set"); process.exit(1); }
  
  const chain   = CHAIN_ID === 44787 ? celoAlfajores : celo;
  const account = privateKeyToAccount(ADMIN_PK);
  
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ chain, transport: http(RPC_URL), account });
  
  // ── ABI ───────────────────────────────────────────────────────────────────────
  const ABI = [
    {
      name: "createMatch", type: "function", stateMutability: "nonpayable",
      inputs: [
        { name: "matchId",      type: "string"  },
        { name: "homeTeam",     type: "string"  },
        { name: "awayTeam",     type: "string"  },
        { name: "league",       type: "string"  },
        { name: "commenceTime", type: "uint256" },
        { name: "homeOddBP",    type: "uint256" },
        { name: "drawOddBP",    type: "uint256" },
        { name: "awayOddBP",    type: "uint256" },
      ],
      outputs: [{ name: "matchIndex", type: "uint256" }],
    },
    {
      name: "resolveMatch", type: "function", stateMutability: "nonpayable",
      inputs: [
        { name: "matchIndex", type: "uint256" },
        { name: "result",     type: "uint8"   },
      ],
      outputs: [],
    },
    {
      name: "cancelMatch", type: "function", stateMutability: "nonpayable",
      inputs: [{ name: "matchIndex", type: "uint256" }],
      outputs: [],
    },
    {
      name: "closeMatch", type: "function", stateMutability: "nonpayable",
      inputs: [{ name: "matchIndex", type: "uint256" }],
      outputs: [],
    },
    {
      name: "withdrawFees", type: "function", stateMutability: "nonpayable",
      inputs: [], outputs: [],
    },
    {
      name: "getMatchCount", type: "function", stateMutability: "view",
      inputs: [], outputs: [{ type: "uint256" }],
    },
    {
      name: "getMatch", type: "function", stateMutability: "view",
      inputs: [{ name: "matchIndex", type: "uint256" }],
      outputs: [
        {
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
        },
      ],
    },
  ] as const;
  
  const OUTCOME_ENUM: Record<string, number> = { none: 0, home: 1, draw: 2, away: 3 };
  const STATUS_NAME  = ["OPEN", "CLOSED", "RESOLVED", "CANCELLED"];
  const RESULT_NAME  = ["NONE", "HOME", "DRAW", "AWAY"];
  
  // ── Commands ──────────────────────────────────────────────────────────────────
  
  async function createMatch(args: string[]) {
    const [matchId, home, away, league, commenceISO, homeOdd, drawOdd, awayOdd] = args;
    if (!matchId || !home || !away || !league || !commenceISO || !homeOdd || !drawOdd || !awayOdd) {
      console.error("Usage: create-match <matchId> <home> <away> <league> <commenceISO> <homeOdd> <drawOdd> <awayOdd>");
      process.exit(1);
    }
  
    const commenceTime = BigInt(Math.floor(new Date(commenceISO).getTime() / 1000));
    const homeOddBP    = BigInt(Math.round(parseFloat(homeOdd) * 10000));
    const drawOddBP    = BigInt(Math.round(parseFloat(drawOdd) * 10000));
    const awayOddBP    = BigInt(Math.round(parseFloat(awayOdd) * 10000));
  
    console.log(`Creating match: ${home} vs ${away} (${league})`);
    console.log(`Commence: ${commenceISO}  Odds: ${homeOdd} / ${drawOdd} / ${awayOdd}`);
  
    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "createMatch",
      args: [matchId, home, away, league, commenceTime, homeOddBP, drawOddBP, awayOddBP],
      account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`✅ Match created! tx: ${tx} (block ${receipt.blockNumber})`);
  }
  
  async function resolveMatch(args: string[]) {
    const [indexStr, resultStr] = args;
    if (!indexStr || !resultStr) {
      console.error("Usage: resolve-match <matchIndex> <home|draw|away>");
      process.exit(1);
    }
    const matchIndex = BigInt(indexStr);
    const result     = OUTCOME_ENUM[resultStr.toLowerCase()];
    if (!result) { console.error("Invalid result. Use: home | draw | away"); process.exit(1); }
  
    console.log(`Resolving match #${indexStr} with result: ${resultStr.toUpperCase()}`);
  
    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "resolveMatch",
      args: [matchIndex, result],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`✅ Match resolved! tx: ${tx}`);
  }
  
  async function cancelMatch(args: string[]) {
    const [indexStr] = args;
    if (!indexStr) { console.error("Usage: cancel-match <matchIndex>"); process.exit(1); }
    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "cancelMatch",
      args: [BigInt(indexStr)],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`✅ Match #${indexStr} cancelled. tx: ${tx}`);
  }
  
  async function closeMatch(args: string[]) {
    const [indexStr] = args;
    if (!indexStr) { console.error("Usage: close-match <matchIndex>"); process.exit(1); }
    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "closeMatch",
      args: [BigInt(indexStr)],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`✅ Betting closed for match #${indexStr}. tx: ${tx}`);
  }
  
  async function listMatches() {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "getMatchCount",
    }) as bigint;
  
    console.log(`\nTotal matches on contract: ${count}\n`);
    console.log("─".repeat(70));
  
    for (let i = 0n; i < count; i++) {
      const m = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: ABI,
        functionName: "getMatch", args: [i],
      }) as any;
  
      const date = new Date(Number(m.commenceTime) * 1000).toISOString();
      const poolTotal = Number(m.poolHome + m.poolDraw + m.poolAway) / 1e18;
      console.log(`#${i}  ${m.homeTeam} vs ${m.awayTeam} (${m.league})`);
      console.log(`    Date: ${date}`);
      console.log(`    Odds: ${Number(m.homeOddBP)/10000} / ${Number(m.drawOddBP)/10000} / ${Number(m.awayOddBP)/10000}`);
      console.log(`    Pool: ${poolTotal.toFixed(2)} cUSD  |  Status: ${STATUS_NAME[m.status]}  |  Result: ${RESULT_NAME[m.result]}`);
      console.log();
    }
  }
  
  async function withdrawFees() {
    const tx = await walletClient.writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "withdrawFees",
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`✅ Fees withdrawn. tx: ${tx}`);
  }
  
  // ── Main ──────────────────────────────────────────────────────────────────────
  
  const [,, command, ...args] = process.argv;
  
  (async () => {
    switch (command) {
      case "create-match":  await createMatch(args);  break;
      case "resolve-match": await resolveMatch(args); break;
      case "cancel-match":  await cancelMatch(args);  break;
      case "close-match":   await closeMatch(args);   break;
      case "list-matches":  await listMatches();      break;
      case "withdraw-fees": await withdrawFees();     break;
      default:
        console.log("Commands: create-match | resolve-match | cancel-match | close-match | list-matches | withdraw-fees");
    }
  })();
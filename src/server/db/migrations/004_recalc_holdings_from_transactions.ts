import type pg from 'pg';

/**
 * Migration 004: Recalculate all holdings from transaction history
 *
 * Replays buy/sell transactions in chronological order to derive correct
 * shares and avg_cost for every holding. Fixes stale data from before
 * the recalculation logic was added.
 */

export const version = 4;
export const description = 'Recalculate all holdings shares and avg_cost from transactions';

export async function up(client: pg.PoolClient): Promise<void> {
  // Get all distinct (account_id, symbol) pairs from holdings
  const { rows: holdings } = await client.query<{ id: number; account_id: number; symbol: string }>(
    'SELECT id, account_id, symbol FROM holdings ORDER BY id'
  );

  let updated = 0;

  for (const holding of holdings) {
    // Get all transactions for this symbol+account, oldest first
    const { rows: txs } = await client.query<{ type: string; shares: string; price: string; fees: string }>(
      'SELECT type, shares, price, fees FROM transactions WHERE symbol = $1 AND account_id = $2 ORDER BY date ASC, id ASC',
      [holding.symbol, holding.account_id]
    );

    let shares = 0;
    let totalCost = 0;

    for (const tx of txs) {
      const txShares = Number(tx.shares);
      const txPrice = Number(tx.price);
      const txFees = Number(tx.fees);

      if (tx.type === 'buy') {
        totalCost += txShares * txPrice + txFees;
        shares += txShares;
      } else {
        if (shares > 0) {
          const avgCostBefore = totalCost / shares;
          shares -= txShares;
          if (shares <= 0) {
            shares = 0;
            totalCost = 0;
          } else {
            totalCost = shares * avgCostBefore;
          }
        }
      }
    }

    const avgCost = shares > 0 ? totalCost / shares : 0;

    await client.query(
      'UPDATE holdings SET shares = $1, avg_cost = $2 WHERE id = $3',
      [shares, avgCost, holding.id]
    );
    updated++;
  }

  console.log(`Recalculated ${updated} holdings from transaction history`);
}

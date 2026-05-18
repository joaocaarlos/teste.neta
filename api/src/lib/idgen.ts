import { query } from "../db";

export async function nextId(prefix: string, sequence: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    "SELECT next_id($1, $2) AS id",
    [prefix, sequence]
  );
  return (rows[0] as { id: string }).id;
}

export const newDemandId   = () => nextId("DM",  "seq_demand_id");
export const newProposalId = () => nextId("PR",  "seq_proposal_id");
export const newOrderId    = () => nextId("PD",  "seq_order_id");
export const newContractId = () => nextId("CT",  "seq_contract_id");
export const newNdaId      = () => nextId("NDA", "seq_nda_id");
export const newDisputeId  = () => nextId("DP",  "seq_dispute_id");
export const newReviewId   = () => nextId("RV",  "seq_review_id");
export const newTxnId      = () => nextId("TXN", "seq_txn_id");
export const newRecurId    = () => nextId("CR",  "seq_recur_id");

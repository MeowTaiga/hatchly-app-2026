export interface TradeOfferItem {
  itemType: string;
  qty: number;
}

export interface TradeParticipant {
  userId: string;
  username: string;
  petName: string;
  petImageUrl: string;
}

export type TradeStatus =
  | 'pending'
  | 'open'
  | 'completing'
  | 'declined'
  | 'cancelled'
  | 'completed';

export interface TradeState {
  tradeId: string;
  status: TradeStatus;
  version: number;
  youUserId: string;
  partner: TradeParticipant;
  yourOffer: TradeOfferItem[];
  theirOffer: TradeOfferItem[];
  youReady: boolean;
  theyReady: boolean;
  waitingForAccept?: boolean;
  /** Shown in the trade drawer for terminal statuses (declined / cancelled). */
  endMessage?: string;
}

export interface IncomingTradeRequest {
  tradeId: string;
  fromUserId: string;
  fromUsername: string;
  fromPetName: string;
  fromPetImageUrl: string;
}

export function isTradeTerminal(status: TradeStatus | undefined): boolean {
  return status === 'declined' || status === 'cancelled' || status === 'completed';
}

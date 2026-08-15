/**
 * Bridge so PetProfileDrawer (outside MultiplayerProvider) can start a trade
 * while the active multiplayer scene owns the TradeProvider.
 */

type RequestTradeFn = (targetUserId: string) => void;

let impl: RequestTradeFn | null = null;

export function registerTradeRequestHandler(fn: RequestTradeFn | null): void {
  impl = fn;
}

export function requestTradeWith(targetUserId: string): boolean {
  if (!impl) return false;
  impl(targetUserId);
  return true;
}

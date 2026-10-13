const { ForbiddenError } = require('./apiError');

/**
 * Wallet freeze enforcement.
 *
 * An administrator can freeze a user's wallet (admin panel -> Wallets). The flag
 * (`isFrozenWallet` on FreelancerProfile / ClientProfile) used to be stored and
 * shown but never checked, so a frozen user could still move money. It now
 * blocks every flow in which money LEAVES the wallet:
 *   - a client funding a milestone, locking hourly escrow, paying a gig
 *     deposit or final payment, or accepting a proposal (which does the first two);
 *   - a freelancer withdrawing.
 * Money coming IN (an escrow release, a refund, a Stripe top-up) is still
 * credited, so a freeze holds funds in place instead of losing them.
 *
 * Each debit site also puts `isFrozenWallet: { $ne: true }` in its atomic
 * conditional update, so a freeze applied between the check and the debit still
 * wins; this module only supplies the clear error for the common case.
 */
const WALLET_FROZEN_MESSAGE =
  'Your wallet is frozen, so money cannot be moved out of it right now. Please contact SkillKart support.';

const walletFrozenError = () => {
  const err = new ForbiddenError(WALLET_FROZEN_MESSAGE);
  err.errors = { walletFrozen: true }; // lets the interface react without matching the text
  return err;
};

/** Throws the frozen-wallet error if the profile's wallet is frozen. */
const assertWalletNotFrozen = (profile) => {
  if (profile && profile.isFrozenWallet) throw walletFrozenError();
};

module.exports = { WALLET_FROZEN_MESSAGE, walletFrozenError, assertWalletNotFrozen };

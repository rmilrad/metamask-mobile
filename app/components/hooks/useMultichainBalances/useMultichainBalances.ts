/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../../../selectors/preferencesController';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import {
  MultichainBalancesData,
  UseMultichainBalancesHook,
} from './useMultichainBalances.types';
import { formatWithThreshold } from '../../../util/assets';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainShouldShowFiat,
  getMultichainNetworkAggregatedBalance,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
///: END:ONLY_INCLUDE_IF
import I18n from '../../../../locales/i18n';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { isEvmAccountType } from '@metamask/keyring-api';

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  // Refs to track which dependencies change between renders
  const prevDepsRef = useRef<{
    accountsList?: any;
    chainId?: string;
    currentCurrency?: string;
    isTokenNetworkFilterEqualCurrentNetwork?: boolean;
    isPopularNetwork?: boolean;
    isOriginalNativeTokenSymbol?: boolean;
    formattedTokensWithBalancesPerChain?: any;
    totalFiatBalancesCrossChain?: any;
    providerType?: string;
    ticker?: string;
  }>({});

  // Production selectors (EVM)
  const accountsList = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const chainId = useSelector(selectChainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const { type } = useSelector(selectProviderConfig);
  const ticker = useSelector(selectEvmTicker);

  // Production hooks (EVM)
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    accountsList,
    !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
    allChainIDs,
  );

  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    accountsList,
    formattedTokensWithBalancesPerChain,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  // Add render tracking to identify which dependencies change
  useEffect(() => {
    // Compare current values with previous values
    const depsChanged = [];

    if (prevDepsRef.current.accountsList !== accountsList) {
      depsChanged.push('accountsList');
    }

    if (prevDepsRef.current.chainId !== chainId) {
      depsChanged.push('chainId');
    }

    if (prevDepsRef.current.currentCurrency !== currentCurrency) {
      depsChanged.push('currentCurrency');
    }

    if (
      prevDepsRef.current.isTokenNetworkFilterEqualCurrentNetwork !==
      isTokenNetworkFilterEqualCurrentNetwork
    ) {
      depsChanged.push('isTokenNetworkFilterEqualCurrentNetwork');
    }

    if (prevDepsRef.current.isPopularNetwork !== isPopularNetwork) {
      depsChanged.push('isPopularNetwork');
    }

    if (
      prevDepsRef.current.isOriginalNativeTokenSymbol !==
      isOriginalNativeTokenSymbol
    ) {
      depsChanged.push('isOriginalNativeTokenSymbol');
    }

    if (prevDepsRef.current.providerType !== type) {
      depsChanged.push('providerType');
    }

    if (prevDepsRef.current.ticker !== ticker) {
      depsChanged.push('ticker');
    }

    // Check if formattedTokensWithBalancesPerChain changed (this is a complex object)
    if (
      prevDepsRef.current.formattedTokensWithBalancesPerChain !==
      formattedTokensWithBalancesPerChain
    ) {
      depsChanged.push('formattedTokensWithBalancesPerChain');
    }

    // Check if totalFiatBalancesCrossChain changed (this is a complex object)
    if (
      prevDepsRef.current.totalFiatBalancesCrossChain !==
      totalFiatBalancesCrossChain
    ) {
      depsChanged.push('totalFiatBalancesCrossChain');
    }

    // Log only if something changed
    if (depsChanged.length > 0) {
      console.log(
        'useMultichainBalances dependencies changed:',
        depsChanged.join(', '),
      );
    }

    // Update refs for next comparison
    prevDepsRef.current = {
      accountsList,
      chainId,
      currentCurrency,
      isTokenNetworkFilterEqualCurrentNetwork,
      isPopularNetwork,
      isOriginalNativeTokenSymbol,
      formattedTokensWithBalancesPerChain,
      totalFiatBalancesCrossChain,
      providerType: type,
      ticker,
    };
  });

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  ///: END:ONLY_INCLUDE_IF

  // Production balance calculartion (EVM)
  const getEvmBalance = useCallback(
    (account: InternalAccount) => {
      const balance = Engine.getTotalFiatAccountBalance(account);
      let total;

      if (isOriginalNativeTokenSymbol) {
        if (isPortfolioViewEnabled()) {
          total =
            totalFiatBalancesCrossChain[account?.address as string]
              ?.totalFiatBalance ?? 0;
        } else {
          const tokenFiatTotal = balance?.tokenFiat ?? 0;
          const ethFiatTotal = balance?.ethFiat ?? 0;
          total = tokenFiatTotal + ethFiatTotal;
        }
      } else if (isPortfolioViewEnabled()) {
        total =
          totalFiatBalancesCrossChain[account?.address as string]
            ?.totalTokenFiat ?? 0;
      } else {
        total = balance?.tokenFiat ?? 0;
      }

      const displayBalance = formatWithThreshold(total, 0, I18n.locale, {
        style: 'currency',
        currency: currentCurrency.toUpperCase(),
      });

      return {
        displayBalance,
        totalFiatBalance: total,
        totalNativeTokenBalance: total,
        nativeTokenUnit: 'ETH',
      };
    },
    [currentCurrency, isOriginalNativeTokenSymbol, totalFiatBalancesCrossChain],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const getMultiChainFiatBalance = useCallback(
    (balance: string, currency: string) => {
      return formatWithThreshold(parseFloat(balance), 0, I18n.locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      });
    },
    [],
  );

  const getNonEvmDisplayBalance = useCallback(
    (account: InternalAccount) => {
      const accountBalance = getMultichainNetworkAggregatedBalance(
        account,
        multichainBalances,
        multichainAssets,
        multichainAssetsRates,
        nonEvmChainId,
      );

      if (!shouldShowFiat) {
        return `${accountBalance.totalNativeTokenBalance.amount} ${accountBalance.totalNativeTokenBalance.unit}`;
      }

      return getMultiChainFiatBalance(
        accountBalance.totalBalanceFiat,
        currentCurrency,
      );
    },
    [
      currentCurrency,
      getMultiChainFiatBalance,
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      nonEvmChainId,
      shouldShowFiat,
    ],
  );
  ///: END:ONLY_INCLUDE_IF

  const getAggregatedBalance = useMemo(
    () => (account: InternalAccount) => {
      const balance = Engine.getTotalFiatAccountBalance(account);
      return {
        ethFiat: balance?.ethFiat ?? 0,
        tokenFiat: balance?.tokenFiat ?? 0,
        tokenFiat1dAgo: balance?.tokenFiat1dAgo ?? 0,
        ethFiat1dAgo: balance?.ethFiat1dAgo ?? 0,
      };
    },
    [],
  );

  const getAccountBalanceData = useCallback(
    (
      account: InternalAccount,
    ): {
      displayBalance: string;
      totalFiatBalance: string;
      totalNativeTokenBalance: string;
      nativeTokenUnit: string;
    } => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (!isEvmAccountType(account.type)) {
        const nonEvmAccountBalance = getMultichainNetworkAggregatedBalance(
          account,
          multichainBalances,
          multichainAssets,
          multichainAssetsRates,
          nonEvmChainId,
        );
        return {
          displayBalance: getNonEvmDisplayBalance(account),
          totalFiatBalance: nonEvmAccountBalance.totalBalanceFiat,
          totalNativeTokenBalance:
            nonEvmAccountBalance.totalNativeTokenBalance.amount,
          nativeTokenUnit: nonEvmAccountBalance.totalNativeTokenBalance.unit,
        };
      }
      ///: END:ONLY_INCLUDE_IF
      const evmAccountBalance = getEvmBalance(account);
      return {
        displayBalance: evmAccountBalance.displayBalance,
        totalFiatBalance: evmAccountBalance.totalFiatBalance.toString(),
        totalNativeTokenBalance:
          evmAccountBalance.totalNativeTokenBalance.toString(),
        nativeTokenUnit: evmAccountBalance.nativeTokenUnit,
      };
    },
    [
      getEvmBalance,
      getNonEvmDisplayBalance,
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      nonEvmChainId,
    ],
  );

  const getShouldShowAggregatedPercentage = useMemo(
    () => (account: InternalAccount) => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      return !isTestNet(chainId) && isEvmAccountType(account.type);
      ///: END:ONLY_INCLUDE_IF

      // Note: This code marked as unreachable however when the above block gets removed after code fencing this return becomes necessary
      return !isTestNet(chainId);
    },
    [chainId],
  );

  const isPortfolioEnabled = isPortfolioViewEnabled();

  // Create a stable reference for each account's balance data
  const allAccountBalances = useMemo(() => {
    const result: Record<string, MultichainBalancesData> = {};

    for (const account of accountsList) {
      const accountBalanceData = getAccountBalanceData(account);
      result[account.id] = {
        displayBalance: accountBalanceData.displayBalance,
        displayCurrency: currentCurrency,
        totalFiatBalance: accountBalanceData.totalFiatBalance,
        totalNativeTokenBalance: accountBalanceData.totalNativeTokenBalance,
        nativeTokenUnit: accountBalanceData.nativeTokenUnit,
        tokenFiatBalancesCrossChains:
          totalFiatBalancesCrossChain[account.address]
            ?.tokenFiatBalancesCrossChains ?? [],
        shouldShowAggregatedPercentage:
          getShouldShowAggregatedPercentage(account),
        isPortfolioVieEnabled: isPortfolioEnabled,
        aggregatedBalance: getAggregatedBalance(account),
      };
    }

    return result;
  }, [
    accountsList,
    currentCurrency,
    getAccountBalanceData,
    getShouldShowAggregatedPercentage,
    isPortfolioEnabled,
    totalFiatBalancesCrossChain,
    getAggregatedBalance,
  ]);

  const selectedAccountMultichainBalance = useMemo(() => {
    if (selectedInternalAccount) {
      const accountBalanceData = getAccountBalanceData(selectedInternalAccount);
      return {
        displayBalance: accountBalanceData.displayBalance,
        displayCurrency: currentCurrency,
        totalFiatBalance: accountBalanceData.totalFiatBalance,
        totalNativeTokenBalance: accountBalanceData.totalNativeTokenBalance,
        nativeTokenUnit: accountBalanceData.nativeTokenUnit,
        tokenFiatBalancesCrossChains:
          totalFiatBalancesCrossChain[selectedInternalAccount.address]
            ?.tokenFiatBalancesCrossChains ?? [],
        shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(
          selectedInternalAccount,
        ),
        isPortfolioVieEnabled: isPortfolioEnabled,
        aggregatedBalance: getAggregatedBalance(selectedInternalAccount),
      };
    }
    return undefined;
  }, [
    currentCurrency,
    getAccountBalanceData,
    getShouldShowAggregatedPercentage,
    isPortfolioEnabled,
    selectedInternalAccount,
    totalFiatBalancesCrossChain,
    getAggregatedBalance,
  ]);

  return {
    multichainBalancesForAllAccounts: allAccountBalances,
    selectedAccountMultichainBalance,
  };
};

export default useMultichainBalances;

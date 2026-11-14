import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { CampScene, itemName, PREMIUM_SHOWCASE } from '@/cosmetics';
import { premiumSet, SLOTS } from '@/domain';
import { PREMIUM_ID, TIP_IDS, usePurchases, type Notice, type NoticeKind } from '@/purchases';
import { spacing } from '@/theme';

/** Good news, plain news, or a problem. */
const NOTICE_COLOUR: Record<NoticeKind, 'success' | 'text' | 'danger'> = {
  premiumOn: 'success',
  thanks: 'success',
  restored: 'success',
  tipCleared: 'success',
  pending: 'text',
  nothingToRestore: 'text',
  network: 'danger',
  unavailable: 'danger',
  billing: 'danger',
  failed: 'danger',
};

/**
 * The subscription and the tips. Prices come from Google Play as it shows them to the buyer,
 * so they are in the buyer's currency and always match the payment sheet.
 */
export default function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const purchases = usePurchases();
  const { status, premium, products, busy, notice, preview } = purchases;

  // Opened from a link there is nothing to go back to, so return to the tabs instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const ready = status === 'ready';
  const priceOf = (id: string) => products.find((product) => product.id === id)?.price;
  const premiumPrice = priceOf(PREMIUM_ID);
  const tips = TIP_IDS.flatMap((id) => {
    const price = priceOf(id);
    return price ? [{ id, price }] : [];
  });
  /** Premium that was paid for, as opposed to the look a developer switched on. */
  const subscribed = premium && !(preview?.on ?? false);

  // The premium set slot by slot, in wardrobe order: "Headwear: top hat, headphones, cat ears, duck".
  const set = premiumSet();
  const lines = SLOTS.flatMap((slot) => {
    const names = set.filter((reward) => reward.slot === slot).map((reward) => itemName(t, slot, reward.item));
    return names.length > 0 ? [{ slot, text: `${t(`camp.slots.${slot}`)}: ${names.join(', ')}` }] : [];
  });

  /** What came of the last request, in the part of the screen it was made from. */
  const outcome = (about: Notice['about']) => {
    if (notice?.about !== about) return null;
    const colour = NOTICE_COLOUR[notice.kind];
    return (
      <AppText accessibilityLiveRegion="polite" accessibilityRole={colour === 'danger' ? 'alert' : undefined} color={colour}>
        {t(`support.notices.${notice.kind}`)}
      </AppText>
    );
  };

  const subscription = () => {
    if (subscribed) {
      return (
        <>
          <AppText color="success" strong>
            {t('support.active')}
          </AppText>
          {ready ? <Button label={t('support.manage')} onPress={purchases.manage} variant="quiet" /> : null}
        </>
      );
    }
    if (!ready) return null;
    if (!premiumPrice) return <AppText color="muted">{t('support.premiumNotSold')}</AppText>;
    return (
      <>
        <AppText variant="heading">{t('support.price', { price: premiumPrice })}</AppText>
        <Button
          disabled={busy !== null}
          label={busy === PREMIUM_ID ? t('support.waiting') : t('support.subscribe')}
          onPress={() => purchases.buy(PREMIUM_ID)}
          variant="accent"
        />
        <AppText color="muted" variant="label">
          {t('support.terms')}
        </AppText>
      </>
    );
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('support.title')}>
      <Card tone="cardAlt">
        <AppText>{t('support.intro')}</AppText>
        {status === 'ready' ? null : (
          <AppText accessibilityLiveRegion="polite" color="muted">
            {t(`support.store.${status}`)}
          </AppText>
        )}
        {status === 'failed' ? <Button label={t('support.store.retry')} onPress={purchases.retry} variant="quiet" /> : null}
      </Card>

      <Card>
        <CampScene label={t('support.premiumAlt')} look={PREMIUM_SHOWCASE} />
        <AppText variant="heading">{t('support.premiumTitle')}</AppText>
        <AppText>{t('support.premiumBody', { count: set.length })}</AppText>
        <View style={styles.list}>
          {lines.map((line) => (
            <AppText key={line.slot} variant="label">
              {line.text}
            </AppText>
          ))}
        </View>
        <AppText color="muted" variant="label">
          {t('support.premiumSame')}
        </AppText>
        {subscription()}
        {outcome('premium')}
      </Card>

      <Card>
        <AppText variant="heading">{t('support.tipsTitle')}</AppText>
        <AppText>{t('support.tipsBody')}</AppText>
        {ready && tips.length === 0 ? <AppText color="muted">{t('support.tipsNotSold')}</AppText> : null}
        {ready
          ? tips.map(({ id, price }) => (
              <Button
                disabled={busy !== null}
                key={id}
                label={busy === id ? t('support.waiting') : t('support.tip', { price })}
                onPress={() => purchases.buy(id)}
              />
            ))
          : null}
        {outcome('tips')}
      </Card>

      {ready ? (
        <Card>
          <Button
            disabled={busy !== null}
            label={busy === 'restore' ? t('support.restoring') : t('support.restore')}
            onPress={purchases.restore}
            variant="quiet"
          />
          <AppText color="muted" variant="label">
            {t('support.restoreHint')}
          </AppText>
          {outcome('restore')}
        </Card>
      ) : null}

      {preview ? (
        <Card tone="cardAlt">
          <AppText variant="heading">{t('support.dev.title')}</AppText>
          <AppText color="muted" variant="label">
            {t('support.dev.body')}
          </AppText>
          <Button
            label={preview.on ? t('support.dev.hide') : t('support.dev.show')}
            onPress={() => preview.set(!preview.on)}
            variant="quiet"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
});

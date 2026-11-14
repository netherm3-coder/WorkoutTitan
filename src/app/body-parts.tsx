import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Icon, Screen, TextField } from '@/components';
import type { OwnBodyPart } from '@/domain';
import { namesakeOf, useBodyParts, useRecords } from '@/records';
import { minTouchTarget, spacing } from '@/theme';

/** Adding, renaming, deleting and bringing back body parts of the person's own. */
export default function BodyPartsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { measurements, bodyParts, deletedBodyParts, addBodyPart, renameBodyPart, deleteBodyPart, restoreBodyPart } =
    useRecords();
  const { parts } = useBodyParts();

  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  /** The part whose deletion waits for a yes. */
  const [confirming, setConfirming] = useState<string | null>(null);
  /** The part being renamed, and the name typed for it so far. */
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renameProblem, setRenameProblem] = useState<string | null>(null);
  const [restoreProblem, setRestoreProblem] = useState<string | null>(null);
  const [listProblem, setListProblem] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/body'));

  const valuesOf = (part: OwnBodyPart) => measurements.filter((item) => item.part === part.id).length;

  /** Why a name cannot be used, or `null` when it can. Built-in parts count, in the current language. */
  const nameProblem = (typed: string, exceptId?: string) => {
    if (typed.trim() === '') return t('parts.nameRequired');
    if (namesakeOf(typed, parts, (part) => part.name, exceptId)) return t('parts.nameTaken');
    return null;
  };

  const add = () => {
    const found = nameProblem(name);
    setProblem(found);
    if (found) return;
    addBodyPart(name.trim()).then(
      () => setName(''),
      (error: unknown) => {
        console.warn('Could not add the body part', error);
        setProblem(t('parts.saveFailed'));
      },
    );
  };

  const rename = () => {
    if (!renaming) return;
    const found = nameProblem(renaming.name, renaming.id);
    setRenameProblem(found);
    if (found) return;
    renameBodyPart(renaming.id, renaming.name.trim()).then(
      () => setRenaming(null),
      (error: unknown) => {
        console.warn('Could not rename the body part', error);
        setRenameProblem(t('parts.saveFailed'));
      },
    );
  };

  const remove = (part: OwnBodyPart) => {
    setListProblem(null);
    deleteBodyPart(part.id).then(
      () => setConfirming(null),
      (error: unknown) => {
        console.warn('Could not delete the body part', error);
        setListProblem(t('parts.saveFailed'));
      },
    );
  };

  const restore = (part: OwnBodyPart) => {
    if (namesakeOf(part.name, parts, (item) => item.name)) {
      setRestoreProblem(t('parts.restoreTaken', { name: part.name }));
      return;
    }
    setRestoreProblem(null);
    restoreBodyPart(part.id).catch((error: unknown) => {
      console.warn('Could not bring the body part back', error);
      setRestoreProblem(t('parts.saveFailed'));
    });
  };

  const row = (part: OwnBodyPart) => {
    if (renaming?.id === part.id) {
      return (
        <View key={part.id} style={styles.block}>
          <TextField
            label={t('parts.newName', { name: part.name })}
            onChangeText={(text) => setRenaming({ id: part.id, name: text })}
            value={renaming.name}
          />
          {renameProblem ? (
            <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
              {renameProblem}
            </AppText>
          ) : null}
          <Button label={t('parts.save')} onPress={rename} />
          <Button label={t('parts.cancel')} onPress={() => setRenaming(null)} variant="accent" />
        </View>
      );
    }

    if (confirming === part.id) {
      const count = valuesOf(part);
      return (
        <View key={part.id} style={styles.block}>
          <AppText>
            {count === 0
              ? t('parts.confirmDeleteUnused', { name: part.name })
              : t('parts.confirmDelete', { name: part.name, count })}
          </AppText>
          <Button label={t('parts.confirm')} onPress={() => remove(part)} variant="danger" />
          <Button label={t('parts.keep')} onPress={() => setConfirming(null)} variant="accent" />
        </View>
      );
    }

    return (
      <View key={part.id} style={styles.row}>
        <AppText strong style={styles.grow}>
          {part.name}
        </AppText>
        <Pressable
          accessibilityLabel={t('parts.rename', { name: part.name })}
          accessibilityRole="button"
          onPress={() => {
            setConfirming(null);
            setRenameProblem(null);
            setRenaming({ id: part.id, name: part.name });
          }}
          style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
        >
          <Icon name="create-outline" />
        </Pressable>
        <Pressable
          accessibilityLabel={t('parts.delete', { name: part.name })}
          accessibilityRole="button"
          onPress={() => {
            setRenaming(null);
            setConfirming(part.id);
          }}
          style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
        >
          <Icon name="trash-outline" />
        </Pressable>
      </View>
    );
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('parts.title')}>
      <Card tone="cardAlt">
        <AppText color="muted" variant="label">
          {t('parts.hint')}
        </AppText>
        {bodyParts.length === 0 ? <AppText color="muted">{t('parts.empty')}</AppText> : null}
        {bodyParts.map(row)}
        {listProblem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {listProblem}
          </AppText>
        ) : null}
      </Card>

      {deletedBodyParts.length > 0 ? (
        <Card>
          <AppText variant="heading">{t('parts.deleted')}</AppText>
          {deletedBodyParts.map(({ part, measurements: count }) => (
            <View key={part.id} style={styles.row}>
              <View style={styles.grow}>
                <AppText strong>{part.name}</AppText>
                <AppText color="muted" variant="label">
                  {t('parts.deletedValues', { count })}
                </AppText>
              </View>
              <Button
                accessibilityLabel={t('parts.restoreLabel', { name: part.name })}
                label={t('parts.restore')}
                onPress={() => restore(part)}
                variant="accent"
              />
            </View>
          ))}
          {restoreProblem ? (
            <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
              {restoreProblem}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{t('parts.new')}</AppText>
        <TextField label={t('parts.name')} onChangeText={setName} value={name} />
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
        <Button label={t('parts.add')} onPress={add} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  block: {
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  icon: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

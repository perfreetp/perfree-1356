import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { PainRecord } from '@/types';
import { BODY_PART_NAMES, getPainLevelText, getRecoveryStatusText } from '@/utils/risk';
import dayjs from 'dayjs';

interface PainRecordCardProps {
  record: PainRecord;
}

const PainRecordCard: React.FC<PainRecordCardProps> = ({ record }) => {
  const getPainColor = (level: number) => {
    if (level <= 3) return '#10B981';
    if (level <= 6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View className={styles.card}>
      <View className={styles.cardHeader}>
        <View className={styles.partBadge}>
          📍 {BODY_PART_NAMES[record.bodyPart]}
        </View>
        <Text className={styles.dateText}>
          {dayjs(record.timestamp).format('MM-DD HH:mm')}
        </Text>
      </View>

      <View className={styles.painLevelSection}>
        <View className={styles.painLabel}>
          <Text>疼痛程度：{getPainLevelText(record.painLevel)}</Text>
          <Text className={styles.painValue} style={{ color: getPainColor(record.painLevel) }}>
            {record.painLevel}/10
          </Text>
        </View>
        <View className={styles.painBar}>
          <View
            className={styles.painFill}
            style={{ width: `${record.painLevel * 10}%`, backgroundColor: getPainColor(record.painLevel) }}
          />
        </View>
        <View className={styles.painMarks}>
          <Text>轻微</Text>
          <Text>中度</Text>
          <Text>剧烈</Text>
          <Text>难忍</Text>
        </View>
      </View>

      {record.description && (
        <Text className={styles.descText}>{record.description}</Text>
      )}

      <View>
        <Text className={styles.sectionTitle}>恢复状态</Text>
        <View className={styles.statusRow}>
          <View className={classnames(styles.tag, styles.statusTag, styles[record.recoveryStatus])}>
            {getRecoveryStatusText(record.recoveryStatus)}
          </View>
        </View>
      </View>

      {record.triggers.length > 0 && (
        <View>
          <Text className={styles.sectionTitle}>诱发因素</Text>
          <View className={styles.statusRow}>
            {record.triggers.map((t, i) => (
              <View key={i} className={classnames(styles.tag, styles.triggerTag)}>{t}</View>
            ))}
          </View>
        </View>
      )}

      {record.measures.length > 0 && (
        <View>
          <Text className={styles.sectionTitle}>处理措施</Text>
          <View className={styles.statusRow}>
            {record.measures.map((m, i) => (
              <View key={i} className={classnames(styles.tag, styles.measureTag)}>{m}</View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default PainRecordCard;

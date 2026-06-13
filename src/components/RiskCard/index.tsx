import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { RiskLevel } from '@/types';
import { getRiskLevelText, getRiskLevelColor } from '@/utils/risk';

interface RiskCardProps {
  level: RiskLevel;
  score: number;
  suggestions: string[];
  showTitle?: boolean;
}

const RiskCard: React.FC<RiskCardProps> = ({ level, score, suggestions, showTitle = true }) => {
  return (
    <View className={styles.riskCard}>
      {showTitle && (
        <View className={styles.riskHeader}>
          <Text style={{ fontSize: 32, fontWeight: 600, color: '#1E293B' }}>风险评估结果</Text>
          <View className={classnames(styles.riskLevel, styles[level])}>
            {getRiskLevelText(level)}
          </View>
        </View>
      )}

      <View className={styles.riskScoreWrap}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <Text style={{ fontSize: 28, color: '#64748B' }}>风险评分</Text>
          <View>
            <Text style={{ fontSize: 56, fontWeight: 700, color: getRiskLevelColor(level) }}>{score}</Text>
            <Text style={{ fontSize: 24, color: '#94A3B8' }}> /100</Text>
          </View>
        </View>
        <View className={styles.scoreBar}>
          <View className={styles.scoreFill} style={{ width: `${score}%`, backgroundColor: getRiskLevelColor(level) }} />
        </View>
        <View className={styles.scoreText}>
          <Text>安全 0-34</Text>
          <Text>注意 35-59</Text>
          <Text>危险 60+</Text>
        </View>
      </View>

      <View className={styles.suggestList}>
        <Text style={{ fontSize: 28, fontWeight: 600, color: '#1E293B', marginBottom: 16, display: 'block' }}>
          健康建议
        </Text>
        {suggestions.map((s, i) => (
          <View key={i} className={styles.suggestItem}>
            <View className={styles.dot} />
            <Text className={styles.suggestText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default RiskCard;
